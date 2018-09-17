const Slack = require('slack');
const slugify = require('slugify');

const fs = require('fs');
const token = process.env.SLACK_TOKEN;

class SlackDownloader {
	constructor({token}) {
		this.slack = new Slack({token});
	}

	async getMembersMap() {
		const rawUsers = await this.slack.users.list();
		return rawUsers.members.reduce((list, user) => Object.assign(list, {[user.id]: user.profile.real_name}), {});
	}

	async getInstantMessageList() {
		const rawIM = await this.slack.im.list();
		return rawIM.ims;
	}

	async getConversationsList() {
		const rawConversations = await this.slack.conversations.list({types: 'public_channel,private_channel'});
		return rawConversations.channels;
	}

	async getConversationHistory(params, membersList) {
		const chat = await this.slack.conversations.history(Object.assign(params, {limit: 1000}));
		let messages = chat.messages.map(m => Object.assign(m, {user: membersList[m.user]}));

		console.log('Loading...');

		if (chat.has_more === true) {
			const latest = messages[messages.length - 1].ts;
			return messages.concat(await this.getConversationHistory(Object.assign(params, {latest}), membersList));
		}

		return messages;
	}

	async getInstantMessageHistory(params, membersList) {
		const chat = await this.slack.im.history(Object.assign(params, {count: 1000}));
		let messages = chat.messages.map(m => Object.assign(m, {user: membersList[m.user]}));

		console.log('Loading...');

		if (chat.has_more === true) {
			const latest = messages[messages.length - 1].ts;
			return messages.concat(await this.getInstantMessageHistory(Object.assign(params, {latest}), membersList));
		}

		return messages;
	}
}

(async () => {
	const slackDownloader = new SlackDownloader({token});
	const membersList = await slackDownloader.getMembersMap();
	const imList = await slackDownloader.getInstantMessageList();

	const getFilename = (name) => {
		const sluggedName = slugify(name, '_').toLowerCase();
		const date = new Date();

		return `${sluggedName}__${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}_${date.getHours()}${date.getMinutes()}.json`
	}

	const channelsList = await (async () => {
		const temp = await slackDownloader.getConversationsList();
		return temp.reduce((map, chn) => Object.assign(map, {[chn.id]: chn.name}), {});
	})();

	const downloadInstantMessage = async (channel) => {
		const imProfile = imList.find(i => i.id === channel);
		const filename = getFilename(membersList[imProfile.user]);
		const results = await slackDownloader.getInstantMessageHistory({channel}, membersList);

		fs.writeFile(filename, JSON.stringify(results), function(err) {
			if(err) {
				return console.log(err);
			}

			console.log(`The file was saved at ${filename} which contains ${results.length} entries`);
		});
	}

	const downloadConversation = async (channel) => {
		const filename = getFilename(channelsList[channel]);
		const results = await slackDownloader.getConversationHistory({channel}, membersList);

		fs.writeFile(filename, JSON.stringify(results), function(err) {
			if(err) {
				return console.log(err);
			}

			console.log(`The file was saved at ${filename} which contains ${results.length} entries`);
		});
	}

	if (process.argv.length === 2) {
		console.log('** Instant Messages **');
		imList.forEach(im => console.log(im.id, membersList[im.user]));

		console.log('\n** Channels **');
		for(const property in channelsList) {
			console.log(property, channelsList[property]);
		}
	} else {
		const channel = process.argv[2];

		if (channel.startsWith('D')) {
			await downloadInstantMessage(channel);
		} else if (channel.startsWith('G') || channel.startsWith('C')) {
			await downloadConversation(channel);
		}
	}
})();

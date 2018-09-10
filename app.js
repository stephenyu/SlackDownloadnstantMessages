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

	async getInstantMessageHistory(params) {
		const chat = await this.slack.im.history(Object.assign(params, {count: 1000}));
		let messages = chat.messages;

		console.log('Loading...');

		if (chat.has_more === true) {
			const latest = messages[messages.length - 1].ts;
			return messages.concat(await this.getInstantMessageHistory(Object.assign(params, {latest})));
		}

		return messages;
	}
}

(async () => {
	const slackDownloader = new SlackDownloader({token});
	const membersList = await slackDownloader.getMembersMap();
	const imList = await slackDownloader.getInstantMessageList();

	if (process.argv.length === 2) {
		imList.forEach(im => console.log(im.id, membersList[im.user]));
	} else {
		const channel = process.argv[2];
		const imProfile = imList.find(i => i.id === channel);
		const name = membersList[imProfile.user];

		const sluggedName = slugify(name, '_').toLowerCase();

		const results = await slackDownloader.getInstantMessageHistory({channel});
		const date = new Date()
		const filename = `${sluggedName}__${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}_${date.getHours()}${date.getMinutes()}.json`

		fs.writeFile(filename, JSON.stringify(results), function(err) {
			if(err) {
				return console.log(err);
			}

			console.log(`The file was saved at ${filename} which contains ${results.length} entries`);
		});
	}
})();



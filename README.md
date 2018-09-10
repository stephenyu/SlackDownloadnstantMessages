# Download Slack Conversations

Given a User IM Channel ID, writes to a JSON file for you to peruse
Get your Slack User Token at https://api.slack.com/custom-integrations/legacy-tokens

Return a List of All User Matched IM Channel IDs
```
$ SLACK_TOKEN='magictoken' node app.js
D0F43P05N slackbot
ABCF3P05N John Doe
ABF43P05N Jane Smith
```

Given an ID, download all Instant Messages
```
$ SLACK_TOKEN='magictoken' node app.js ABF43P05N
Loading...
Loading...
Loading...
Loading...
The file was saved at john_doe__2018910_1635.json which contains 1481 entries
```


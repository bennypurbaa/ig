const Client = require('instagram-private-api').V1;
const delay = require('delay');
const chalk = require('chalk');
const _ = require('lodash');
const rp = require('request-promise');
const inquirer = require('inquirer');

const User = [
	{
		type:'input',
		name:'username',
		message:'Insert Username'
	},
	{
		type:'password',
		name:'password',
		message:'Insert Password',
		mask:'*'
	},
	{
		type:'input',
		name:'target',
		message:'Insert Username Target (Without @[at])'
	},
	{
		type:'input',
		name:'text',
		message:'Insert Text Comment 1 (Gunakan Pemisah [|] bila lebih dari 1)'
	},
	{
		type:'input',
		name:'sleep',
		message:'Insert Sleep (In MiliSeconds)',
		validate: function(value){
			value = value.match(/[0-9]/);
			if (value) return true;
			return 'Delay is number';
		}
	}
]

const Login = async function(User){

    const Device = new Client.Device(User.username);
    const Storage = new Client.CookieMemoryStorage();
    const session = new Client.Session(Device, Storage);

    try {
        await Client.Session.create(Device, Storage, User.username, User.password)
        const account = await session.getAccount();
        return Promise.resolve({session,account});
    } catch (err) {
        return Promise.reject(err);
    }

}

const Target = async function(username){
	const url = 'https://www.instagram.com/'+username+'/?__a=1'
	const option = {
		url: url,
		method: 'GET',
		json:true
	}
	try{
		const account = await rp(option);
		if (account.user.is_private) {
			return Promise.reject('Target is private Account');
		} else {
			const id = account.user.id;
			const followers = account.user.followed_by.count;
			return Promise.resolve({id,followers});			
		}
	} catch (err){
		return Promise.reject(err);
	}

}

const CommentAndLike = async function(session, accountId, text){

	const feed = new Client.Feed.UserMedia(session, accountId);

	try {
		const result = await feed.get();
		if (result.length > 0) {
			const Follow = Client.Relationship.create(session, accountId);
			const doComment = Client.Comment.create(session, result[0].params.id, text);
			const doLike =  Client.Like.create(session, result[0].params.id);
			await Promise.all([Follow,doComment,doLike]);
			return chalk`{bold.green SUKSES [Follow,Comment,Like]} | ${text}`;
		}
		return chalk`{bold.green SUKSES [FOLLOW]}`
	} catch (err) {
		return chalk`{bold.red GAGAL}`;
	}

};

const Followers = async function(session, id){
	const feed = new Client.Feed.AccountFollowers(session, id);
	try{
		const Pollowers = [];
		var cursor;
		do {
			if (cursor) feed.setCursor(cursor);
			const getPollowers = await feed.get();
			await Promise.all(getPollowers.map(async(akun) => {
				Pollowers.push(akun.id);
			}))
			cursor = await feed.getCursor();
		} while(feed.isMoreAvailable());
		return Promise.resolve(Pollowers);
	} catch(err){
		return Promise.reject(err);
	}
}

const Excute = async function(User, TargetUsername, Text, Sleep){
	try {
		const doLogin = await Login(User);
		const getTarget = await Target(TargetUsername);
		console.log(chalk`{yellow ${TargetUsername}[${getTarget.id}] Followers: ${getTarget.followers}}\n`)
		const getFollowers = await Followers(doLogin.session, doLogin.account.id)
		const Targetfeed = new Client.Feed.AccountFollowers(doLogin.session, getTarget.id);
		var TargetCursor;
		do {
			if (TargetCursor) Targetfeed.setCursor(TargetCursor);
			var TargetResult = await Targetfeed.get();
			TargetResult = _.chunk(TargetResult, 5);
			for (let i = 0; i < TargetResult.length; i++) {
				await Promise.all(TargetResult[i].map(async(akun) => {
					if (!getFollowers.includes(akun.id) && akun.params.isPrivate === false) {
						var ranText = Text[Math.floor(Math.random() * Text.length)];
						const ngeDo = await CommentAndLike(doLogin.session, akun.id, ranText)
						console.log(chalk`{bold.green [>]}${akun.params.username} => ${ngeDo}`)
					} else {
						console.log(chalk`{bold.yellow [SKIPPED]}${akun.params.username} => PRIVATE OR ALREADY FOLLOWED`)
					}
				}));
				console.log(chalk`{yellow Delay For ${Sleep} MiliSeconds}`);
				await delay(Sleep);
			}
			TargetCursor = await Targetfeed.getCursor();
			console.log(chalk`{yellow Delay For ${Sleep} MiliSeconds}`);
			await delay(Sleep);
		} while(Targetfeed.isMoreAvailable());
	} catch (err) {
		console.log(err);
	}
}

console.log(chalk`
{bold Instagram FFT Auto Comment, Auto Like, Auto Follow}
{green BC0DE.NET - NAONLAH.NET - WingKocoli}
{bold.red Code By Ccocot | ccocot@bc0de.net}
`);

inquirer.prompt(User)
	.then(answers => {
		var text = answers.text.split('|');
		Excute({
			username:answers.username,
			password:answers.password
		},answers.target,text,answers.sleep);
	})

			const followers = account.user.followed_by.count;
			return Promise.resolve({id,followers});			
		}
	} catch (err){
		return Promise.reject(err);
	}

}

const Feed = async function(session, accountId, cursor){

	const feed = new Client.Feed.AccountFollowers(session, accountId);
	if (cursor) {
		feed.setCursor(cursor);
	}
	try {
		var result = await feed.get();
		const Account = [];
		await Promise.all(result.map(async(account) => {
			if(account.params.isPrivate === false){
				Account.push({id:account.params.id,username:account.params.username});
			}
		}))
		const getCursor = await feed.getCursor();
		return Promise.resolve({Account,getCursor});
	} catch (err) {
		return Promise.reject(err);
	}
}

const CommentLastPhoto = async function(session, accountId, text){

	const feed = new Client.Feed.UserMedia(session, accountId);

	try {
		const result = await feed.get();
		if (result.length > 0) {
			await Client.Comment.create(session, result[0].params.id, text);
			return true;
		}
	} catch (err) {
		return false;
	}

};

const Excute = async function(User, TargetUsername, TextComment){

	try {
		console.log(chalk`{bold.yellow [?] }Try to Login..`);
		const doLogin = await Login(User);
		console.log(chalk`{bold.green [+] }Login success, Try to get Followers and Id ${TargetUsername} ..`)
		const getTarget = await Target(TargetUsername);
		console.log(chalk`{bold.green [+] }Id target found ${getTarget.id}, ${getTarget.followers} Followers,Try to doAction..\n`)
		var cursor = null;
		do {
			const doAction = await Feed(doLogin.session, getTarget.id, cursor);
			const account = _.chunk(doAction.Account,10);
			cursor = doAction.cursor || null;
			for (let i = 0; i < account.length; i++) {
				await Promise.all(account[i].map(async(account) => {
					await Client.Relationship.create(doLogin.session, account.id);
					console.log(chalk`{bold.green [+|Followed]} ({bold.cyan ${account.username}}) ${account.id}`);
				}));
//				console.log(chalk`{bold.yellow [!]} Delay For 30000 Milisecond (30 Seconds) To Send DM`);
//				await delay(30000);
//				await Promise.all(account[i].map(async(account) => {
//					await Client.Thread.configureText(doLogin.session, account.id, TextDM);
//					console.log(chalk`{bold.green [+|Send DM]} ({bold.cyan ${account.username}}) ${account.id}`);
//				}))
				console.log(chalk`{bold.yellow [!]} Delay For 30000 Milisecond (30 Seconds) To Send Comment`);
				await delay(30000);
				await Promise.all(account[i].map(async(account) => {
					const doComment = CommentLastPhoto(doLogin.session, account.id, TextComment);
					if (doComment) {
						console.log(chalk`{bold.green [+|Comment Added]} ({bold.cyan ${account.username}}) ${account.id} => ${TextComment}`);
					} else {
						console.log(chalk`{bold.red [-|Comment Failed]} ({bold.cyan ${account.username}}) ${account.id} => GAGAL`);
					}
				}));
				console.log(chalk`{bold.yellow [!]} Delay For 60000 Milisecond (1 Minute) To Next Block`);
				await delay(60000);
			}
			console.log(chalk`{bold.yellow [!]} Delay For 60000 Milisecond (1 Minute) To Next Cursor`);
			await delay(30000);
		}
		while(cursor != null);
	} catch (err) {
		console.log(err);
	}

}

const TextComment = "Follback nya ya kawan :D";
const TextDM = 'Follback Kak :D';
Excute(User,TargetUsername,TextComment);

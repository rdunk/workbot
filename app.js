require('dotenv').config();

var awaitingConfirmation = false;

// require node packages
var Botkit = require('botkit'),
	moment = require('moment'),
	_ = require('lodash'),
	cloudant = require('./storage-cloudant')({account:"zakgroup",password:process.env.SLACK_TOKEN});

// controller
// var controller = Botkit.slackbot({ json_file_store: 'db' });

var controller = Botkit.slackbot({ storage: cloudant });

// require workbot files
var tools = require('./tools')(controller),
	entries = require('./entries')(controller),
	users = require('./users')(controller),
	cron = require('./cron')(),
	patterns = require('./patterns'),
	phrases = require('./phrases');

controller.spawn({
	token: process.env.SLACK_TOKEN
}).startRTM(function (err,bot,payload) {
	if (err) {
		throw new Error(err);
	}
	// TODO
	// console.log(payload.users);
	// consider using payload.users instead of getting team list via api
	addTasks(bot);
});

// ------------------------------
// Morning / Evening Tasks
// ------------------------------

function morningSide(channel, bot) {
	getNext(function(target){
		bot.say({
			text: "Did " + tools.mentionUser(target) + " do the dishwasher last?",
			channel: channel
		});
		awaitingConfirmation = "morning";
	});
}

function eveningSide(channel, bot) {
	getNext(function(target){
		bot.say({
			text: "Hi " + tools.mentionUser(target) + ". Can you please load the dishwasher before you leave?",
			channel: channel
		});
		awaitingConfirmation = "evening";
	});
}

// ------------------------------
// Add Tasks
// ------------------------------

function addTasks(bot) {
	tools.getChannelFromName(process.env.CHANNEL, bot, function(channel){
		if (channel) {
			cron.createJob({
				cronTime: process.env.MORNING,
				onTick: function(){
					morningSide(channel.id, bot);
				}
			});
			cron.createJob({
				cronTime: process.env.EVENING,
				onTick: function(){
					eveningSide(channel.id, bot);
				}
			});
			cron.createJob({
				cronTime: '00 30 17 * * 5',
				onTick: function(){
					bot.say({
						text: "Cleaning Time!",
						channel: channel.id
					});
				}
			});
		}
	});
}



// ------------------------------
// Force Jobs
// ------------------------------

controller.hears(phrases.tasks.morning, 'direct_message', function(bot,message) {
	morningSide(message.channel, bot);
});

controller.hears(phrases.tasks.evening, 'direct_message', function(bot,message) {
	eveningSide(message.channel, bot);
});

// ------------------------------
// List Previous Dishwasher
// ------------------------------

function listLastEntries(bot, message) {
	var limit = message.match[1] ? parseInt(message.match[1]) : 1;
	entries.list(limit, function(arr){
		var outString = "";
		_.each(arr, function(line){
			var type = typeof line;
			if (type === 'string') {
				outString += "\n"+line;
			} else if (type === 'object') {
				outString += "\n"+tools.mentionUser(line.user)+" "+line.time;
			}
		});
		bot.say({
			text: outString,
			channel: message.channel
		});
	});
}

controller.hears([patterns.lastentries], 'direct_message,ambient',function(bot,message){
	listLastEntries(bot, message);
});

// ------------------------------
// Confirm Dishwasher
// ------------------------------

controller.hears([patterns.yes], 'direct_message,ambient',function(bot,message){
	if (awaitingConfirmation == "morning") {
		getNext(function(user){
			var date = moment().subtract(1, 'day').format("YYMMDD");
			entries.save(date, user, function(err, newuser){
				getNext(function(user){
					bot.say({
						text: "OK, great. Thanks.\nThat means it's " + tools.mentionUser(user) + " turn today.",
						channel: message.channel
					});
				});
			});
		});
	} else if (awaitingConfirmation == "evening") {
		bot.say({
			text: "Great, thanks.",
			channel: message.channel
		});
	}
	awaitingConfirmation = false;
});

controller.hears([patterns.no], 'direct_message,ambient',function(bot,message){
	if (awaitingConfirmation == "morning") {
		bot.say({
			text: "Oh, OK.",
			channel: message.channel
		});
	} else if (awaitingConfirmation == "evening") {
		bot.say({
			text: "I see.",
			channel: message.channel
		});
	}
	awaitingConfirmation = false;
});

// ------------------------------
// Last Dishwasher
// ------------------------------

controller.hears([patterns.lastdishwasher],'direct_message,ambient',function(bot,message){
	entries.getLast(function(entry, time){
		tools.typing(bot, message.channel);
		bot.say({
			text: tools.mentionUser(entry.user)+" did the dishwasher "+time+".",
			channel: message.channel
		});
	});
});


// ------------------------------
// Next Dishwasher
// ------------------------------

function getNext(cb){
	users.getAll(function(users){
		var userids = _.chain(users).sortBy('id').map('id').value();
		entries.getAll(function(entries){
			_.eachRight(entries, function(entry) {
				_.pull(userids, entry.user);
				if (userids.length === 1) {
					return false;
				}
			});
			var target = userids[0];
			cb(target);
		});
	});
}

controller.hears(["who next"],'direct_message,ambient',function(bot,message){
	getNext(function(user){
		tools.typing(bot, message.channel);
		bot.say({
			text: "It's " + tools.mentionUser(user)+"'s turn to do the dishwasher.",
			channel: message.channel
		});
	});
});


// ------------------------------
// Update Team
// ------------------------------

function updateTeam(bot, convo, callback) {
	bot.api.users.list({}, function (err, response) {
		if (response.hasOwnProperty('members') && response.ok) {
			var newTeam = _(response.members).filter(function(member){
				return (!member.is_bot && !member.deleted && member.name !== "slackbot" && member.name !== "zgmeetingroom");
			}).each(function(member) {
				controller.storage.users.save(member);
			});
			callback(newTeam);
		}
	});
}

function askUpdateTeam(response, convo, bot){
	convo.ask("Do you really want to update the team list?", [
		{
			pattern: patterns.yes,
			callback: function(response, convo) {
				updateTeam(bot, convo, function(userlist){
					convo.say("OK. The new team list looks like this: "+tools.getUsersAsMentions(userlist));
					convo.next();
				});
			}
		},{
			pattern: patterns.no,
			callback: function(response, convo) {
				convo.say("OK. No problem.");
				convo.next();
			}
		}
	]);
}

controller.hears(phrases.team.update,'direct_message,ambient',function(bot,message) {
	bot.startConversation(message, function(response, convo){
		askUpdateTeam(response, convo, bot);
	});
});

// ------------------------------
// Ask who did the dishwasher
// ------------------------------

function confirmOverwrite(response, convo, date, uid, user) {
	convo.ask("Apparently "+tools.mentionUser(user.user)+" did the dishwasher on that date, do you want to replace that entry?", [
		{
			pattern: patterns.yes,
			callback: function(response, convo) {
				entries.save(date, uid, function(){
					tools.getUserFromDatabase(uid, function(newuser){
						convo.say("OK. Replacing "+tools.mentionUser(user.user)+" with "+tools.mentionUser(newuser.id)+".");
						convo.next();
					});
				});
			}
		},{
			pattern: patterns.no,
			callback: function(response, convo) {
				convo.say("OK. Keeping "+tools.mentionUser(user.user)+" as the original entry.");
				convo.next();
			}
		}
	]);
}

function checkForEntryAndSave(response, convo, date, uid) {
	entries.get(date, uid, function(err, user){
		if (err) {
			entries.save(date, uid, function(err, newuser){
				var time = entries.getEntryTime(date);
				convo.say("OK. I saved the entry for "+time+".");
			});
		} else {
			confirmOverwrite(response, convo, date, uid, user);
		}
	});
}

function askDate(response, convo, uid) {
	convo.ask('On which date? Use either "today", "yesterday" or the date in YYMMDD format. (e.g. 160301 for 1st March 2016)', [
		{
			pattern: patterns.date,
			callback: function(response, convo) {
				var date = response.text;
				checkForEntryAndSave(response, convo, date, uid);
				convo.next();
			}
		},{
			pattern: "today",
			callback: function(response, convo) {
				var date = moment().format("YYMMDD");
				checkForEntryAndSave(response, convo, date, uid);
				convo.next();
			}
		},{
			pattern: "yesterday",
			callback: function(response, convo) {
				var date = moment().subtract(1, 'day').format("YYMMDD");
				checkForEntryAndSave(response, convo, date, uid);
				convo.next();
			}
		},{
			pattern: "cancel",
			callback: function(response, convo) {
				convo.say('OK. Scrap that.');
				convo.next();
			}
		},{
			default: true,
			callback: function(response, convo) {
				convo.repeat();
				convo.next();
			}
		}
	]);
}

function askDishwasher(response, convo) {
	convo.ask("Which user did the dishes? (e.g. @workbot)", [
		{
			pattern: patterns.username,
			callback: function(response, convo) {
				var userid = tools.userIdFromResponse(response);
				tools.getUserFromDatabase(userid, function(user){
					if (typeof(user) !== "undefined") {
						askDate(response, convo, userid);
						convo.next();
					} else {
						convo.say("You need to add "+ response.text + " to the list first.");
						convo.next();
					}
				});
			}
		}
	]);
}


controller.hears(['add dishwasher'],'direct_message,ambient',function(bot,message){
	bot.startConversation(message, function(response, convo){
		askDishwasher(response, convo);
	});
});

// ------------------------------
// List users
// ------------------------------

controller.hears(phrases.users.list,'direct_message,ambient',function(bot,message){
	users.getAll(function(users){
		// bot.reply(message, tools.getUsersAsMentions(users));
		tools.typing(bot, message.channel);
		bot.say({
			text: tools.getUsersAsMentions(users),
			channel: message.channel
		});
	});
});

// ------------------------------
// Remove User
// ------------------------------

function askForUserToRemove(response, convo) {
	convo.ask("Which user do you want to remove? (e.g. @workbot)", [
		{
			pattern: patterns.username,
			callback: function(response, convo) {
				var userid = tools.userIdFromResponse(response);
				tools.getUserFromDatabase(userid, function(user){
					if (typeof(user) !== "undefined") {
						controller.storage.users.delete(userid, function(){
							convo.say("OK. Removed " + response.text + " from the user list.");
							convo.next();
						});
					} else {
						convo.say("The user "+ response.text + " does not appear in the list.");
						convo.next();
					}
				});
			}
		}
	]);
}

controller.hears(phrases.users.remove,'direct_message,ambient',function(bot,message){
	bot.startConversation(message, function(response, convo) {
		askForUserToRemove(response, convo);
	});
});

// ------------------------------
// Add User
// ------------------------------

function askForUserToAdd(response, convo, bot) {
	convo.ask("Which user do you want to add? (e.g. @workbot)", [
		{
			pattern: patterns.username,
			callback: function(response, convo) {
				var userid = tools.userIdFromResponse(response);
				tools.getUserFromAPI(userid, bot, function(apiresponse){
					if (apiresponse.ok) {
						tools.getUserFromDatabase(userid, function(user){
							if (typeof(user) !== "undefined") {
								convo.say("The user "+ response.text + " is already in the list.");
								convo.next();
							} else {
								if (apiresponse.user.is_bot || apiresponse.user.name == "slackbot") {
									convo.say("Sorry, bots can't be added to the list.");
									convo.next();
								} else if (apiresponse.user.deleted) {
									convo.say("Sorry, that user no longer exists.");
									convo.next();
								} else {
									controller.storage.users.save(apiresponse.user, function(){
										convo.say("OK. Added " + response.text + " to the user list.");
										convo.next();
									});
								}
							}
						});
					} else {
						convo.say("Sorry, that user could not be found.");
						convo.next();
					}
				});
			}
		},{
			pattern: "cancel",
			callback: function(response, convo) {
				convo.say("OK, cancelling.");
				convo.next();
			}
		},{
			default: true,
			callback: function(response, convo) {
				convo.say("Sorry, I didn't recognize that as a username, try again or type \"cancel\" to stop adding users.");
				convo.repeat();
				convo.next();
			}
		}
	]);
}

controller.hears(phrases.users.add,'direct_message,ambient',function(bot,message) {
	bot.startConversation(message, function(response, convo){
		askForUserToAdd(response, convo, bot);
	});
});

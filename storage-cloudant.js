var Cloudant = require('cloudant');
var _ = require('lodash');

module.exports = function(config) {

    var cloudant = Cloudant({account: config.account, password: config.password});

    var entriesDB = cloudant.db.use("workbot_entries");
    var usersDB = cloudant.db.use("workbot_users");
    var teamsDB = cloudant.db.use("workbot_teams");
    var channelsDB = cloudant.db.use("workbot_channels");

    // var objectsToList = function(cb) {
    //     return function(err, data) {
    //         if (err) {
    //             cb(err, data);
    //         } else {
    //             cb(err, Object.keys(data).map(function(key) {
    //                 return data[key];
    //             }));
    //         }
    //     };
    // };


    var objectsToList = function(cb) {
        return function(err, data) {
            if (err) {
                cb(err, data);
            } else {
                var mappedData = _.map(data.rows, function(row){ return row.doc; });
                cb(err, mappedData);
            }
        };
    };

    var storage = {
        entries: {
            get: function(entry_id, cb) {
                entriesDB.get(entry_id, cb);
            },
            save: function(entry_data, cb) {
                entriesDB.insert(entry_data, entry_data.id, cb);
            },
            all: function(cb) {
                entriesDB.list({include_docs: true}, objectsToList(cb));
            },
            delete: function(entry_id, cb) {
                entriesDB.destroy(entry_id, cb);
            }
        },
        users: {
            get: function(user_id, cb) {
                console.log(user_id);
                usersDB.get(user_id, cb);
            },
            save: function(user, cb) {
                usersDB.insert(user, user.id, cb);
            },
            all: function(cb) {
                usersDB.list({include_docs: true}, objectsToList(cb));
            },
            delete: function(user_id, cb) {
                usersDB.destroy(user_id, cb);
            }
        },
        teams: {
            get: function(team_id, cb) {
                teamsDB.get(team_id, cb);
            },
            save: function(team_data, cb) {
                teamsDB.insert(team_data.id, team_data, cb);
            },
            all: function(cb) {
                teamsDB.list({include_docs: true}, objectsToList(cb));
            },
            delete: function(team_id, cb) {
                teamsDB.destroy(team_id, cb);
            }
        },
        channels: {
            get: function(channel_id, cb) {
                channelsDB.get(channel_id, cb);
            },
            save: function(channel, cb) {
                channelsDB.insert(channel.id, channel, cb);
            },
            all: function(cb) {
                channelsDB.list({include_docs: true}, objectsToList(cb));
            },
            delete: function(channel_id, cb) {
                channelsDB.destroy(channel_id, cb);
            }
        }
    };

    return storage;
};

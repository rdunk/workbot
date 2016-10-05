var fetch = require('node-fetch');

module.exports = function(token) {
	var module = {};

	var returnJSON = function(endpoint) {
		return fetch(endpoint, { 
			method: 'GET',
			headers: {
				"Authorization": "Bearer "+token
			}
		}).then(function(res){
			return res.json();
		}).then(function(json){
			return json;
		});
	}

	module.holidays = {
		get: function() {
			return returnJSON('https://app.timetastic.co.uk:443/api/holidays?nonarchivedusersonly=true&start=2016-10-05&end=2016-10-05&status=Approved');
		}
	};

	module.users = {
		get: function() {
			return returnJSON('https://app.timetastic.co.uk:443/api/users?includeArchivedUsers=false');
		}
	};

	return module;
};
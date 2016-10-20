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
			var currentDate = new Date().toISOString().split('T')[0];
			return returnJSON('https://app.timetastic.co.uk:443/api/holidays?nonarchivedusersonly=true&start='+currentDate+'&end='+currentDate+'&status=Approved');
		}
	};

	module.users = {
		get: function() {
			return returnJSON('https://app.timetastic.co.uk:443/api/users?includeArchivedUsers=false');
		}
	};

	return module;
};
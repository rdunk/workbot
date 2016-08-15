module.exports = {
	username: new RegExp(/^(<@U[A-Z0-9]*?>)$/i),
	yes: new RegExp(/^(yes|yea|yup|yep|ya|sure|ok|y|yeah|yah)/i),
	no: new RegExp(/^(no|nah|nope|n)/i),
	date: new RegExp(/^\d{6}$/),
	lastdishwasher: new RegExp(/(did|loaded) the dishwasher/),
	lastentries: new RegExp(/last ?(\d+)? dishwasher(?:s?)/)
};
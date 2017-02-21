var express = require('express');
var app = express();
var router = express.Router();
var url = require('url');
var bodyParser=require('body-parser');
var mongoose = require('mongoose');
var crypto = require('crypto');

// configure the app to use bodyParser()
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

//Set up default mongoose connection
var mongoDB = 'mongodb://127.0.0.1/jobs';
mongoose.connect(mongoDB);

//Get the default connection
var db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

//Define a schema
var Schema = mongoose.Schema;
/* User Schema */
var userSchema = new Schema({
    userName: {
    	type: String,
    	required: true,
    	unique: true
    },
    email: {
    	type: String,
    	required: true,
    	unique: true
    },
    createDate: Date,
    password: {
    	type: String,
    	required: true,
    	select: false
    },
    salt: {
    	type: String,
    	select: false
    },
    Id: {
    	type: Number,
    	select: false,
    },
    friends: [{
    	Id: Number,
    	userName: String
    }]
});

// Compile model from schema
var User = mongoose.model('User', userSchema );
// make this available to our users in our Node applications
module.exports = User;

/* Game Statics Schema */
var gameStaticsSchema = new Schema({
    userName: { 
    	type: String,
    	ref: 'User'
    }, 
    Id: {
    	type: Number,
    	select: false,
    	unique: true
    },
    win: { type: Number, min: 0 }, 
    lose: { type: Number, min: 0 }, 
    level: { type: Number, min: 0 }, 
    score: { type: Number, min: 0 }, 
    rank: { type: String }
});
var GameStatics = mongoose.model('GameStatics', gameStaticsSchema );
module.exports = GameStatics;

/* Achievement Schema */
var achievementSchema = new Schema({
    userName: { 
    	type: String,
    	ref: 'User'
    }, 
    win_5_in_row: Boolean, 
    lose_5_in_row: Boolean, 
    total_1000_game: Boolean
});
var Achievement = mongoose.model('Achievement', achievementSchema );
module.exports = Achievement;

// API Call
/* User */
// Get User information
app.get('/user', function(req, res) {
	// Can't search the user based on friends' names
	var query = {};
	if (req.query.id != null) query.Id = req.query.id;
	if (req.query.userName != null) query.userName = req.query.userName;
	if (req.query.email != null) query.email = req.query.email;
	// Search in the db
	User.find(query).exec(function(err, result) {
		if (err)  
			console.log('Fail to get a user, ' + err);
		if (result.length) {
			// Only return user's public information
			res.send(result);
		}
		else {
			res.send('No user in db');
		}
	});
});

// Create a new user
app.post('/user',function(req,res) {
	// Validate if the req meets the requirement
	var validate = true;
	// Duplicate UserName
	User.find({userName: req.body.userName}, function(err, result) {
		if (err)  
			console.log('Fail to create a new user, ' + err);
		if (result.length) {
			validate = false;
			res.send('Fail to create a new user, Check the username');
		}
	});

	// Duplicate email
	User.find({userName: req.body.email}, function(err, result) {
		if (err)  
			console.log('Fail to create a new user, ' + err);
		if (result.length) {
			validate = false;
			res.send('Fail to create a new user, Check the email');
		}
	});
	// Hash Password
	var saltHashPwd = saltHashPassword(req.body.password);

	if (validate) {
		var newUser = new User({
			userName: req.body.userName,
			email: req.body.email,
			password: saltHashPassword(req.body.password).passwordHash,
			salt: saltHashPassword(req.body.password).salt,
			createDate: new Date(), 
		});
		newUser.save(function(err) {
			if (err) console.log("Can't create a new user: " + err);
			else res.send('Create a new user successfully');
		});
	}
});
// Update a user
// Only allows to update email and password
app.put('/user/:userName', function(req, res) {
	// Find User
	User.findOne(req.params).select('+password salt email').exec(function (err, user) {
		if (err) console.log(err);
		if (user != null) {
			var hasChange = false;

			if(req.body.email != null && req.body.email != user.email) {
				user.email = req.body.email;
				hasChanged = true;
			}
			if(req.body.password != null) {
				// Hash Password
				var hash = crypto.createHmac('sha512', user.salt); /** Hashing algorithm sha512 */
    			hash.update(req.body.password);
    			var saltHashPwd = hash.digest('hex');
				if (saltHashPwd != user.password) {
					user.password = saltHashPwd;
					hasChanged = true;
				}
			}
			if (hasChanged) {
				user.save(function(err) {
					if (err) console.log(err);
					res.send('Update user information successfully');
				})
			}
			else {
				res.send('Nothing changed, update failed');
			}
		}
		else {
			res.send('No match user in db');
		}
	});
})
// Delete a user
// Should only by admin
app.delete('/user/:userName', function(req, res) {
	User.findOneAndRemove(req.params).exec(function(err, user) {
		if (err) console.log(err);
		if (user != null) {			
			res.send('User successfully deleted!');
		}
		else {
			res.send('No user in db');
		}
	});
});

/* Game statics */
// Get Game Statics
app.get('/game/:userName', function(req, res) {
	User.find(req.params).exec(function(err, user) {
		if (err) console.log(err);
		if (user.length) {
			GameStatics.find(req.params).exec(function(err, result) {
				if (err)  
					console.log('Fail to get game statics, ' + err);
				if (result.length) {
					res.send(result);
				}
				else {
					res.send('No user in Game Statics table');
				}
			})
		}
		else {
			res.send('No user in the db');
		}
	})
})
// Get Specific game statics
app.get('/game/:userName/:para', function(req, res) {
	User.find({userName: req.params.userName}).exec(function(err, user) {
		if (err) throw err;
		if (user.length) {
			GameStatics.find({userName: req.params.userName}).exec(function(err, result) {
				if (err)  
					console.log('Fail to get game statics, ' + err);
				if (result.length) {
					var param = req.params.para.toLowerCase();
					if (param == 'win' && result.win != null) res.send(result[0].win);
					else if (param == 'lose' && result.lose != null) res.send(result[0].lose);
					else if (param == 'level' && result[0].level != null) res.json(result[0].level);
					else if (param == 'score' && result.score != null) res.send(result[0].score);
					else if (param == 'rank' && result.rank != null) res.send(result[0].rank);
					else res.send('No ' + param + ' catelogy in db');
				}
				else {
					res.send('No user in Game Statics table');
				}
			});
		}
		else {
			res.send('No user in the db');
		}
	})
})

// Update game statics 
// Update one game each time, and only by game conpany
app.put('/game/:userName', function(req, res) {
	User.find(req.params).exec(function(err, user) {
		if (err) console.log(err);
		if (user.length) {
			GameStatics.findOneAndUpdate(req.params, {new: true}, function (err, result) {
				if (err)
					console.log('Fail to update game statics, ' + err);
				// No User record in game statics table
				if (result == null) {
					var newRecord = GameStatics({
						userName: req.body.userName,
					});
					// Validate date
					var validate = true;
					if (req.body.win != null && req.body.lose != null) 
						validate = false;
					if (req.body.win != null && req.body.score < 0)
						validate = false;
					if (req.body.lose != null && req.body.score > 0)
						validate = false;
					if (validate) {
						if(req.body.win != null) newRecord.win = req.body.win;
						if(req.body.lose != null) newRecord.lose = req.body.lose;
						if(req.body.level != null) newRecord.level = req.body.level;
						if(req.body.score != null) newRecord.score = req.body.score;
						if(req.body.rank != null) newRecord.win = req.body.rank;
						newRecord.save(function(err) {
							if (err) console.log(err);
							else {
								res.send('Update user game statics successfully');
							}
						})
					}
					else{
						res.send('Invalide date');
					}
				}
				// The user already has info in the game statics table
				else {
					if(req.body.win != null) result.win = req.body.win;
					if(req.body.lose != null) result.lose = req.body.lose;
					if(req.body.level != null) result.level = req.body.level;
					if(req.body.score != null) result.score = req.body.score;
					if(req.body.rank != null) result.win = req.body.rank;
					result.save(function(err) {
						if (err) throw err;
						res.send('Update user game statics successfully');
					})
				}
			})
		}
		else {
			res.send('No user in the db');
		}
	});
});

// Delete a record
// Should only by admin
app.delete('/game/:userName', function(req, res) {
	User.find(req.params).exec(function(err, user) {
		if (err) console.log(err);
		if (user.length) {
			GameStatics.findOneAndRemove(req.params).exec(function(err, result) {
				if (err) console.log(err);
				if (result != null) {			
					res.send('User successfully deleted!');
				}
				else {
					res.send('No user in Game Statics table');
				}
			});
		}
		else {
			res.send('No user in db');
		}
	});
});

/* Achievment */
// Get user all achievement
app.get('/achievement/:userName', function(req, res) {
	// Search in the db
	User.find(req.params).exec(function(err, result) {
		if (err)  
			console.log('Fail to get a user achievement, ' + err);
		if (result.length) {
			Achievement.find(req.params).exec(function(err, achievement) {
				if (err) console.log('Fail to get a user achievement, ' + err);
				if (achievement.length) {
					var showAchievement = [];
					if (achievement[0].win_5_in_row == true) showAchievement.push("win 5 in a row");
					if (achievement[0].lose_5_in_row == true) showAchievement.push("lose 5 in a row");
					if (achievement[0].total_1000_game == true) showAchievement.push("Total game 1000");
					res.json(showAchievement);
				}
				else {
					res.send('No Achievment record for user');
				}
			})
		}
		else {
			res.send('No user in db');
		}
	});
});

// Update user achievement, only by game company
app.put('/achievement/:userName', function(req, res) {
	User.find(req.params).exec(function(err, user) {
		if (err) console.log(err);
		if (user.length) {
			Achievement.findOneAndUpdate(req.params).exec(function (err, result) {
				if (err)
					console.log('Fail to update achievement, ' + err);
				// No record in achievement table, create a new one
				if (result == null) {
					var newRecord = Achievement({
						userName: req.body.userName,
					});
					var validate = true;
					if (req.body.win_5_in_row != null && req.body.lose_5_in_row != null) validate = false;
					if (validate) {
						if (req.body.win_5_in_row == true) newRecord.win_5_in_row = true;
						if (req.body.lose_5_in_row == true) newRecord.lose_5_in_row = true;
						if (req.body.total_1000_game == true) newRecord.total_1000_game = true;
						newRecord.save(function(err) {
							res.setHeader('Content-Type', 'application/json');
							if (err) {
								console.log(err);
							}
							else {
								res.send('Update user achievement successfully');
							}
						})
					}
					else {
						res.send('Invalide data');
					}
				}
				// Update information
				else {
					console.log(result);
					if (req.body.win_5_in_row != null && req.body.lose_5_in_row != null) return res.send('Invalide data');
					if (req.body.win_5_in_row == true && result.win_5_in_row == null) result.win_5_in_row = true;
					if (req.body.lose_5_in_row == true && result.lose_5_in_row == null) result.lose_5_in_row = true;
					if (req.body.total_1000_game == true && result.total_1000_game == null) result.total_1000_game = true;
					result.save(function(err) {
						if (err) throw err;
						res.send('Update user achievement successfully');
					})
				}
			})
		}
		else {
			res.send('No user in the db');
		}
	})
})

// Delete a record
// Should only by admin
app.delete('/achievement/:userName', function(req, res) {
	User.find(req.params).exec(function(err, user) {
		if (err) console.log(err);
		if (user.length) {
			Achievement.findOneAndRemove(req.params).exec(function(err, result) {
				if (err) console.log(err);
				if (result != null) {			
					res.send('User successfully deleted!');
				}
				else {
					res.send('No user in Achievement table');
				}
			});
		}
		else {
			res.send('No user in db');
		}
	});
});

app.listen(3000, function () {
  console.log('The server listening on port 3000!')
});

// Helper function
/**
 * generates random string of characters i.e salt
 * @function
 * @param {number} length - Length of the random string.
 */
function genearateRandomString(length) {
	return crypto.randomBytes(Math.ceil(length/2))
            .toString('hex') /** convert to hexadecimal format */
            .slice(0,length);   /** return required number of characters */ 
}

/**
 * hash password with sha512.
 * @function
 * @param {string} password - List of required fields.
 * @param {string} salt - Data to be validated.
 */
function hashPassword(password, salt){
    var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt:salt,
        passwordHash:value
    };
};

function saltHashPassword(userpassword) {
    var salt = genearateRandomString(16); /** Gives us salt of length 16 */
    var passwordData = hashPassword(userpassword, salt);
    return passwordData;
    // console.log('UserPassword = '+userpassword);
    // console.log('Passwordhash = '+passwordData.passwordHash);
    // console.log('nSalt = '+passwordData.salt);
}

function isAuthenticated(req, res, next) {

    // do any checks you want to in here

    // CHECK THE USER STORED IN SESSION FOR A CUSTOM VARIABLE
    // you can do this however you want with whatever variables you set up
    if (req.user.authenticated)
        return next();

    // IF A USER ISN'T LOGGED IN, THEN REDIRECT THEM SOMEWHERE
    res.redirect('/');
}
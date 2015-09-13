
// --------------------- INCLUDES AND CONFIGURATION  ---------------------
var express =	require('express');
var moment 	=	require('moment');
var fs 		=	require("fs");
var User   	=	require('./models/user');
var jwt    	=	require('jsonwebtoken'); 		// used to create, sign, and verify tokens
var router 	=	express.Router();
var config 	= 	require('./config'); 			// get our config file






// --------------------- TEST DATA  ---------------------
var userDetails = [{ 
		namefirst: "Lord",
		namelast: "_ASDF",
		title: "Security Engineer",
		email: 34,
		messages: 343}];

var ipadd = {
		"time":"12:08:00",
        "date":"9/12/15",
        "ip":"localhost",
        "host":"localhost:1337",
        "user-agent":"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:40.0) Gecko/20100101 Firefox/40.0",
        "accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language":"en-US,en;q=0.5",
        "accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language":"en-US,en;q=0.5",
        "accept-encoding":"gzip, deflate",
        "connection":"keep-alive"}
// --------------------- END TEST DATA  ---------------------






// --------------------- JSON DATABASE FUNCTIONS  ---------------------
function writedatabase(data, db_type){
	fs.writeFile( __dirname + "/" + "iplog_db_" + db_type + ".json", JSON.stringify(data), function (err) {		
			if (err) return console.log(err);											// ERROR CONSOLE LOGGING
	});
}

function loaddatabase(db_type) {
	var db;
	try {
		database = fs.readFileSync( __dirname + "/" + "iplog_db_" + db_type + ".json", 'utf8');
	} catch (e) {
		console.log('Read file error: ' + e);
	}
	return JSON.parse(database);
}
// --------------------- END JSON DATABASE FUNCTIONS  ---------------------






// --------------------- API DATABASE SETUP ROUTES  ---------------------
// ------- ***** CONFIG CONTAINS LIVE DATABASE PASSWORDS ***** ----------
// ---------------------------config.secret------------------------------
// ----------------------------------------------------------------------
router.get('/api/setup', function (req, res) {
	// create a sample user
	var nick = new User({ 
    	name: 'prophetnite', 
    	password: 'password',
    	admin: true 
	});

	// save the sample user
	nick.save(function(err) {
		if (err) throw err;
		console.log('User saved successfully');
    	res.json({ success: true });
	});
});
// --------------------- API DATABASE SETUP ROUTES  ---------------------






// --------------------- CORE SITE PAGES ---------------------
router.get('/', function (req, res){
	var iplog_db = loaddatabase('ip');
	//load data from DB here
	res.render('pages/index', {
		pagetitle: 'Welcome to you Dashboard',
		user: userDetails
	});
});
router.get('/log_ip', function (req, res){
	var iplog_db = loaddatabase('ip');
	//load data from DB here
	res.render('pages/log_ip', {
		pagetitle: "Live IP Log",
		loggedAddresses: iplog_db,
		user: userDetails
	});
});
router.get('/devices', function (req, res){
	//load data from DB here
	res.render('pages/devices', {
		pagetitle: 'Devices',
		user: userDetails
	});
});
router.get('/map', function (req, res){
	//load data from DB here
	res.render('pages/map', {
		pagetitle: 'Live Tracking MAP',
		user: userDetails
	});
});
router.get('/settings', function (req, res){
	//load data from DB here
	res.render('pages/settings', {
		pagetitle: 'Settings',
		user: userDetails
	});
});
router.get('/contacts', function (req, res){
	//load data from DB here
	res.render('pages/contacts', {
		pagetitle: 'Contacts',
		user: userDetails
	});
});
router.get('/about', function (req, res){
	//load data from DB here
	res.render('pages/about', {
		pagetitle: 'About us',
		user: userDetails
	});
});
//  --------------- END CORE SITE PAGES -------------------






// --------------------- API (MONGO) AUTHENTICATION ROUTES  ---------------------
// -- Everything after token verify requires authentication
router.post('/api/authenticate', function (req, res) {
  // find the user
	User.findOne({
		name: req.body.name
	}, function(err, user) {
    	if (err) throw err;
	    if (!user) {
   			res.json({ success: false, message: 'Authentication failed. User not found.' });
    	} else if (user) {
      	// check if password matches
      	if (user.password != req.body.password) {
        	res.json({ success: false, message: 'Authentication failed. Wrong password.' });
      	} else {
        // if user is found and password is right
        // create a token
        var token = jwt.sign(user, config.secret, {
          expiresInMinutes: 1440 // expires in 24 hours
        });
        // return the information including token as JSON
        res.json({
          success: true,
          message: 'Enjoy your token!',
          token: token
        });
      }   
    }
  });
});

// route to show version message (GET http://localhost:8080/api/)
router.get('/api', function (req, res) {
       res.json({ message: 'API v.01: use http://server:port/api/authenticate to receive acess token' });
});

// route middleware to verify a token
router.use(function (req, res, next) {
	// check header or url parameters or post parameters for token
  	var token = req.body.token || req.query.token || req.headers['x-access-token'];
	// decode token
  	if (token) {
    // verifies secret and checks exp
    jwt.verify(token, config.secret	, function(err, decoded) {      // should be set to app.get('globalvar')
    	if (err) {
        	return res.json({ success: false, message: 'Failed to authenticate token.' });    
    	} else {
        	// if everything is good, save to request for use in other routes
        	req.decoded = decoded;    
        	next();
      	}	
    });
  	} else {
	    // if there is no token return an error
	    return res.status(403).send({ 
	        success: false, 
	        message: 'No token provided.' 
	    });
	}
});

// route to return all users (GET http://localhost:8080/api/users)
router.get('/api/users', function (req, res) {
	User.find({}, function (err, users) {
		res.json(users);
	});
});   
// --------------------- END API (MONGO) AUTHENTICATION ROUTES  ---------------------






// --------------------- API (JSON-TEXT) TEST SYSTEM  ---------------------
router.get('/api/create', function (req, res) {	
	var loggedAddresses = loaddatabase('ip');  											// Loading database function
	var trackip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;		// Load tracking data to be logged 
	var ts_hms = moment().format('hh:mm:ss');
	var ts_ymd = moment().format('L');
	var fullheader = req.headers;

	loggedAddresses[Object.keys(loggedAddresses).length + 1] = {						// Update in memory data
		"time": ts_hms,
		"date": ts_ymd,
		"remoteAddress": trackip,
		"headers": fullheader	
	};
	console.log(loggedAddresses);														// DEBUG CONSOLE LOGGING
	writedatabase(loggedAddresses, 'ip');

	res.end('NSA tracking Database: Thanks for reporting in!');
	//res.redirect('/log_ip');

})

router.get('/api/read', function (req, res) {
	var loggedAddresses = loaddatabase('ip');
		for(var attributename in loggedAddresses){
    		console.log(attributename+": "+loggedAddresses[attributename]);
		}	
	res.end(JSON.stringify(loggedAddresses));
})

router.get('/api/read/:id', function (req, res) {
	// First read existing users.
	id = loaddatabase('ip');
	var id = id[req.params.id] 
	console.log( id );														// DEBUG CONSOLE LOGGING
	res.end( JSON.stringify(id));
   
})

router.get('/api/update', function (req, res) {
	var loggedAddresses = loaddatabase('ip');
	res.end(JSON.stringify('NOT YET IMPLEMENTED'));
})

router.get('/api/delete/:id', function (req, res) {
	var loggedAddresses = loaddatabase('ip');
		console.log('total Length: ' + Object.keys(loggedAddresses).length);		// DEBUG CONSOLE LOGGING
	delete loggedAddresses[req.params.id];
    	console.log('after length: ' + Object.keys(loggedAddresses).length );		// DEBUG CONSOLE LOGGING
    write = writedatabase(loggedAddresses, 'ip');
	res.end(write);
})
// --------------------- END API (JSON-TEXT) TEST SYSTEM  ---------------------

module.exports = router;
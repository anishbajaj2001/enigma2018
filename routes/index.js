var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var passport = require('passport');
var User = require("../models/user");
var Question = require("../models/question");
var Logs = require("../models/logs");


router.get('/', (req, res, next) => {
  if(!req.user) {
    res.redirect('/login');
  } else {
    res.redirect('/play');
  }
});

//Render login page
router.get('/login', (req, res, next) => {
  if (req.user) {
    return res.redirect('/');
  }
  return res.render('login', { title: 'Login' });
});

//LOGIN user
router.post('/login', (req, res, next) => {
  passport.authenticate('local', function(err, user) {
    if (err) {
      return res.render('login', { title: 'Login', error : err.message });
    }
    if (!user) {
      return res.render('login', { title: 'Login', error : 'Wrong username/password.' });
    }
    req.logIn(user, function(err) {
      return res.redirect('/');
    });
  })(req, res, next);
});

//LOGOUT user
router.get('/logout', (req, res, next) => {
  req.logout();
  res.redirect('/');
});

//Render register page
router.get('/register', (req, res, next) => {
  if (req.user) {
    return res.redirect('/');
  }
  return res.render('register', { title: 'Register' });
});

//REGISTER user
router.post('/register', function(req, res) {
  User.register(new User({
      username : req.body.username,
      // email: req.body.email,
      level: 0,
    }), req.body.password, function(err, user) {
    if (err) {
      return res.render('register', { title: 'Register', error : 'That team-name has already been taken.' });
    }
    return res.render('register', { title: 'Register', error : 'Team registered successfully.' });
  });
});

//Render leaderboard page
router.get('/leaderboard', (req, res, next) => {
  User.find().sort('-level').sort('lastLevelOn').exec(function(err, leaderboard) {
    return res.render('leaderboard', { leaderboard: leaderboard, title: 'Leaderboard' });
  });
});


//Render play page
router.get('/play', (req, res, next) => {
  if (!req.user) {
    res.redirect('/');
  }
  Question.getQuestion(req.user.level, (question, isOver) => {
    return res.render('play', { question: question, isOver: isOver, title: 'Level ' + req.user.level });
  });
});

//MAIN ANSWER CHECKING
router.post('/play', (req, res, next) => {
  var currentUserUsername = req.user.username;
  var currentUserLevel = req.user.level;
  var currentUserId = req.user.id;

  var logData = {
    username: req.user.username,
    level: currentUserLevel,
    answer: req.body.answer,
    time: new Date()
  };

  //LOG creation
  Logs.create(logData, (error, log) => {
    if (error) {
      return next(error);
    }
  });

  Question.checkAnswer(currentUserLevel, req.body.answer, (err) => {
    if (err) {
      return res.redirect('/play');
    }

    User.findById(currentUserId, function(err, user) {
      if (!user) {
        return res.redirect('/play');
      } else {
        user.level = currentUserLevel + 1;
        user.lastLevelOn = new Date();
        user.save();
      }
    });
    return res.redirect('/');
  });
});

//Render add-question page
router.get('/add-question', (req, res, next) => {
  if (req.user.username != 'admin') {
    res.redirect('/');
  }
  return res.render('add-question', { title: 'Add Question' });
});


//Render admin page
router.get('/admin', (req, res, next) => {
  if (req.user.username != 'admin') {
    res.redirect('/');
  }
  return res.render('admin', { title: 'admin' });
});

//ADD A QUES
router.post('/add-question', (req, res, next) => {
  Question.addQuestion(req.body.level, req.body.question, req.body.answer, (err) => {
    if (err) {
      return res.render('add-question', { error: 'Question for Level ' + req.body.level + ' already exists.', title: 'Add Question' });
    }
    return res.render('add-question', { error: 'Question for Level ' + req.body.level + ' created successfully.', title: 'Add Question' });
  });
});

//Render LOGS page
router.get('/logs', (req, res, next) => {
  if (req.user.username != 'admin') {
    res.redirect('/');
  }
  Logs.find().sort('-time').limit(50).exec(function(err, logs) {
    return res.render('logs', { logs: logs, title: 'Logs', isLogs: true });
  });
});

//Render manage teams page
router.get('/teams', (req, res, next) => {
  if (req.user.username != 'admin' || !req.user.username) {
    res.redirect('/');
  }
  User.find().sort('-level').sort('lastLevelOn').exec(function(err, teams) {
    Question.find().sort('level').exec(function(err, question) {
      return res.render('teams', { teams: teams, questions: question, title: 'Manage Teams' });
    });
  });
});
//SET LEVEL for teams
router.post('/teams', (req, res, next) => {
  User.findOne({username: req.body.username}, function(err, user) {
    user.level = req.body.newLevel;
    user.lastLevelOn = new Date();
    user.save();
  });
  return res.redirect('/teams');
});

//Render manage questions page
router.get('/questions', (req, res, next) => {
  if (req.user.username != 'admin' || !req.user.username) {
    res.redirect('/');
  }
  Question.find().sort('level').exec(function(err, question) {
    return res.render('questions', { questions: question, title: 'Manage Questions' });
  });
});
//SET ANSWERS for questions
router.post('/questions', (req, res, next) => {
  Question.findOne({level: req.body.level}, function(err, question) {
    question.question = req.body.question;
    question.answer = req.body.answer;
    question.save();
  });
  return res.redirect('/questions');
});

router.get('/disqualify', (req, res, next) => {
  if (req.user.username != 'admin' || !req.user.username) {
    res.redirect('/');
  }
  User.find().sort('username').sort('lastLevelOn').exec(function(err, teams) {
    return res.render('disqualify', { teams: teams, title: 'Disqualify' });
  });
});

router.post('/disqualify', (req, res, next) => {
  User.findOne({username: req.body.username}).remove().exec();
  return res.redirect('/disqualify');
});


module.exports = router;

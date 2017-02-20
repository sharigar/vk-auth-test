const express = require('express')
  , passport = require('passport')
  , VkStrategy = require('passport-vkontakte').Strategy
  , request = require('request')
  , bodyParser = require('body-parser')
  , session = require('express-session')
  
  , config = require('./config');
  
const port = process.env.PORT || 8080;
const VK_APP_ID = config.vk_app_id
    , VK_APP_SECRET = config.vk_app_secret;

if (!VK_APP_ID || !VK_APP_SECRET) {
    throw new Error('Set vk_app_id and vk_app_secret (config.js) to run');
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new VkStrategy(
  {
    clientID: VK_APP_ID,
    clientSecret: VK_APP_SECRET,
    callbackURL: config.appUrl + '/auth/vk/callback',
  }, 
  (accessToken, refreshToken, params, profile, done) => done(null, params)
));

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');

app.use(require('cookie-parser')());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({ secret: 'motherboard dog',
                  resave: false,
                  saveUninitialized: true }));
                  
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  
  if (!req.user) {
    res.render('friends', { friendsData: undefined});
  } else {
    renderFriends(req, res);
  }
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.get('/auth/vk',
  passport.authenticate('vkontakte'), (req, res) => {}
);

app.get('/auth/vk/callback', 
  passport.authenticate('vkontakte', { failureRedirect: '/login' }),
  (req, res) => { res.redirect('/') }
);

app.use(function(req, res, next){
  res.status(404);

  res.send('Page not found!');
});

app.listen(port, () => {
   console.log(`Server is running on port ${port}.`);
});

var renderFriends = (req, res) => {
  
  var parameters = 'order=random&count=5&fields=bdate,photo_100';
  var method = 'friends.get';
  var access_token = req.session.passport.user.access_token;
  
  request({
    url: `https://api.vk.com/method/${method}?${parameters}&access_token=${access_token}`,
    json: true
  }, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      var htmlPart = getHtmlFriends(body.response);
      res.render('friends', { friendsData: htmlPart});
    } else {
      console.log('Unable to get data.');
      res.redirect('/');
    }
  });
};

var getHtmlFriends = (friends) => {
  var htmlPart = '';
  friends.forEach((item, i, arr) => {
    htmlPart += 
              `<div class="thumbnail col-sm-2">
              <img class="img-center" src="${item.photo_100}">
              <div class="caption text-center">${item.first_name} ${item.last_name}
              </div></div>`;
  });
  return htmlPart;
};
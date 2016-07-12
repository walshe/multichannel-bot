var express = require('express');

const JSONbig = require('json-bigint');


var facebook = require("../services/facebook");

var router = express.Router();


const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});


/**
 * webhook for fb verification handshake
 */
router.get('/fb-webhook/', function (req, res) {
    console.log('in fb-webhook GET');
    console.log('FB_VERIFY_TOKEN', FB_VERIFY_TOKEN);

    if (req.query['hub.verify_token'] == FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);

        setTimeout(function () {
            facebook.doSubscribeRequest();
        }, 3000);
    } else {
        res.send('Error, wrong validation token');
    }

});


/**
 * webhook that receives the fb chat message after fb has been verified
 */
router.post('/fb-webhook/', function (req, res) {
    console.log('in fb-webhook POST');
    try {
        console.log('the body is:' +JSON.stringify(req.body));
        facebook.processWebhookPost(req.body);

        return res.status(200).json({
            status: "ok"
        });

    } catch (err) {
        return res.status(400).json({
            status: "error",
            error: err
        });
    }

});


module.exports = router;

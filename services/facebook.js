const request = require('request');

const JSONbig = require('json-bigint');
const async = require('async');

var apiai = require("./apiai");

const db = require("./dummydatabase");

const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;


exports.doSubscribeRequest = function () {
    request({
            method: 'POST',
            uri: "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=" + FB_PAGE_ACCESS_TOKEN
        },
        function (error, response, body) {
            if (error) {
                console.error('Error while subscription: ', error);
            } else {
                console.log('Subscription result: ', response.body);
            }
        });
};


exports.processWebhookPost = function(body){
    if(body){
        console.log('there is a body');
    }else{
        console.log('No body');
    }
    console.log('test1');
    //console.log('the body is: ' +JSON.stringify(JSON.parse(body)));
    //console.log('body is:' +body);

    var data = JSONbig.parse(body);
    console.log('test2 ');

    console.log('data',JSON.stringify(data));

    var messaging_events = data.entry[0].messaging;

    console.log('test3');
    for (var i = 0; i < messaging_events.length; i++) {

        console.log('test4');
        var event = data.entry[0].messaging[i];

        //console("event is " +JSON.stringify(event));

        console.log('test5');
        var sender = event.sender.id.toString();
        
        //TODO check the nlp service we are using
        console.log('test6');
        if(event.message && event.message.text){
            console.log('test7 ');
            apiai.processText(sender,event.message.text, this.processReplyCallback);
        }



    }

}


exports.processReplyCallback = function(sender, response){

    "use strict";

    //TODO will need to customise for different responses

    console.log('in processReplyCallback');

    if (isDefined(response.result)) {
        let responseText = response.result.fulfillment.speech;
        let responseData = response.result.fulfillment.data;
        let action = response.result.action;
        let actionIncomplete = response.result.actionIncomplete;

        if (isDefined(responseData) && isDefined(responseData.facebook)) {
            try {
                console.log('Response as formatted message');
                sendFBMessage(sender, responseData.facebook);
            } catch (err) {
                sendFBMessage(sender, {text: err.message });
            }
        } else if (isDefined(responseText)) {
            console.log('Response as text message');
            // facebook API limit for text length is 320,
            // so we split message if needed
            var splittedText = splitResponse(responseText);

            async.eachSeries(splittedText, (textPart, callback) => {
                sendFBMessage(sender, {text: textPart}, callback);
            });
        }


        //when we have collected certain info then do some app specific processing
        if(action && !actionIncomplete){

            switch(action){

                case "getProductsByLocation":

                    sendFBProcessingMessage(sender,true);

                    //use the product and city to get list from our fake database
                    let city = response.result.parameters['geo-city-us'];
                    let productType = response.result.parameters['product'];

                    let products = [];

                    if(db[productType]){

                        _.each(db[productType], function(product){
                            if(product.city == city){
                                //collect
                                products.push(product);
                            }
                        });

                        sendFBProcessingMessage(sender,false);

                        sendFBProductList(sender,products);


                    }else{
                        sendFBMessage(sender, {text: "Could not find any results :(" });
                    }

                    console.log("found following matches for "+productType + " in " + city + " " +JSON.stringify(products));


                    break;

                default:



            }

        }



    }



}

function sendFBMessage(sender, messageData, callback) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: FB_PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: sender},
            message: messageData
        }
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }

        if (callback) {
            callback();
        }
    });
}


function sendFBProcessingMessage(sender, typingOnOrOff, callback){
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: FB_PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: sender},
            sender_action: (typingOnOrOff) ? "typing_on" : "typing_off"
        }
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending processing message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }

        if (callback) {
            callback();
        }
    });
}


function sendFBImage(sender, imageUrl, callback){
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: FB_PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: sender},
            "message":{
                "attachment":{
                    "type":"image",
                    "payload":{
                        "url": imageUrl
                    }
                }
            }
        }
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending image: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }

        if (callback) {
            callback();
        }
    });
}

function sendFBProductList(sender,products, callback){

    "use strict";

    let elements = [];

    _.each(products, function(product){


        var postbackPayload = {
            'productId' : product.productId,
            'fb_action': 'GET_COUPON'
        };

        elements.push( {
                "title":product.name,
                "image_url":product.image,
                "subtitle":"todo",
                "buttons":[
                    {
                        "type":"web_url",
                        "url": product.url,
                        "title":"View Website"
                    },
                    {
                        "type":"postback",
                        "title":"Get Coupon",
                        "payload": JSON.stringify(postbackPayload)
                    }
                ]
            }
        );

    });


    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: FB_PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: sender},
            "message":{
                "attachment":{
                    "type":"template",
                    "payload":{
                        "template_type":"generic",
                        "elements": elements
                    }
                }
            }
        }
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending product list: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }

        if (callback) {
            callback();
        }
    });
}



function splitResponse(str) {
    if (str.length <= 320)
    {
        return [str];
    }

    var result = chunkString(str, 300);

    return result;

}

function chunkString(s, len)
{
    var curr = len, prev = 0;

    var output = [];

    while(s[curr]) {
        if(s[curr++] == ' ') {
            output.push(s.substring(prev,curr));
            prev = curr;
            curr += len;
        }
        else
        {
            var currReverse = curr;
            do {
                if(s.substring(currReverse - 1, currReverse) == ' ')
                {
                    output.push(s.substring(prev,currReverse));
                    prev = currReverse;
                    curr = currReverse + len;
                    break;
                }
                currReverse--;
            } while(currReverse > prev)
        }
    }
    output.push(s.substr(prev));
    return output;
}

function isDefined(obj) {
    if (typeof obj == 'undefined') {
        return false;
    }

    if (!obj) {
        return false;
    }

    return obj != null;
}

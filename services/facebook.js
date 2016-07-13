"use strict";

const request = require('request');

const JSONbig = require('json-bigint');
const async = require('async');
const _ = require('underscore');

var apiai = require("./apiai");
var nlp = require("./nlp");

const db = require("./dummydatabase");

const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;


exports.doSubscribeRequest = function () {
    request({
            method: 'POST',
            uri: "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=" + FB_PAGE_ACCESS_TOKEN
        },
        function (error, response, body) {
            if (error) {
                console.error('Error while subscription:', error);
            } else {
                console.log('Subscription result: ', response.body);
            }
        });
};


exports.processWebhookPost = function(body){

    var data = JSONbig.parse(body);

    var messaging_events = data.entry[0].messaging;

    for (var i = 0; i < messaging_events.length; i++) {

        var event = data.entry[0].messaging[i];

        var sender = event.sender.id.toString();
        
        if(event.message && event.message.text){

            switch (process.env.NLP_SERVICE){
                case nlp.API_AI:
                    apiai.processText(this.processApiAiReplyCallback, sender, event.message.text, null);
                    break;

                case nlp.LUIS:
                    luis.processText(this.processLuisReplyCallback(), sender, event.message.text, null);
                    break;

                default:
                    apiai.processText(this.processApiAiReplyCallback, sender, event.message.text, null);
                    break;

            }


        }

        //payload processing e.g. facebook chat buttons that were clicked
        if(event.postback && event.postback.payload){

            let payload = JSON.parse(event.postback.payload);

            let productId = payload.productId;

            let fbAction = payload['fb_action'];


            if(fbAction == 'GET_COUPON'){

                console.log('getting coupon');

                //find coupon for that productId

                _.each(db.data().restaurant, function(restaurant){
                    if(restaurant.productId == productId){
                        sendFBImage(sender, restaurant.coupon);
                    }
                })

                _.each(db.data().clothing, function(clothingStore){
                    if(clothingStore.productId == productId){
                        sendFBImage(sender, clothingStore.coupon);
                    }
                })



            }



        }

    }




}


/**
 * custom callback for LUIS responses
 * @param sender
 * @param response
 */
exports.processLuisReplyCallback = function(sender, response){
    var data = JSONbig.parse(response.body);

    console.log("got response from LUIS:" +JSON.stringify(data));
    if(data['intents']){
        let topIntent = data['intents'][0];
        if(topIntent.intent == 'getProductByCity'){
            console.log('got getProductByCity');
            if(topIntent.actions[0].triggered){
                console.log('got trigged');
                let parameters = topIntent.actions[0].parameters;

                let productType = '';
                let city = '';

                _.each(parameters, function(parameter){
                    if(parameter.name == 'product'){
                        productType = parameter['value'][0].entity.toLowerCase();
                    }

                    if(parameter.name == 'city'){
                        city = parameter['value'][0].entity;
                    }
                });


                console.log("processed productType ", productType);
                console.log("processed city ", city);

                let products = [];

                if(db.data()[productType]){

                    _.each(db.data()[productType], function(product){
                        if(product.city.toUpperCase() == city.toUpperCase()){
                            //collect
                            products.push(product);
                        }
                    });

                    sendFBProcessingMessage(sender,false);

                    sendFBProductList(sender,products);


                }else{
                    sendFBMessage(sender, {text: "Could not find any results :(" });
                }



            }
        }else if(topIntent.intent == 'None'){
            sendFBMessage(sender, {text: "I did'nt understand what you said, please tell me what you are looking for an where e.g. I'm looking for restaurants in New York" });
        }
    }
}

/**
 * custom callback for API.ai responses
 * @param sender
 * @param response
 */
exports.processApiAiReplyCallback = function(sender, response){


    console.log('in processApiAiReplyCallback');

    console.log('the response is:' +JSON.stringify(response));

    if (isDefined(response.result)) {
        let responseText = response.result.fulfillment.speech;
        let responseData = response.result.fulfillment.data;
        let action = response.result.action;
        let actionIncomplete = response.result.actionIncomplete;

        console.log('test1');

        if (isDefined(responseData) && isDefined(responseData.facebook)) {
            console.log('responseData && responseData.facebook');
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

                    console.log("getting db")
                    console.log("the db is " +JSON.stringify(db.data()));
                    console.log("got db");
                    if(db.data()[productType]){

                        _.each(db.data()[productType], function(product){
                            if(product.city == city){
                                //collect
                                products.push(product);
                            }
                        });

                        console.log("found following matches for "+productType + " in " + city + " " +JSON.stringify(products));

                        sendFBProcessingMessage(sender,false);

                        sendFBProductList(sender,products);


                    }else{
                        sendFBMessage(sender, {text: "Could not find any results :(" });
                    }




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

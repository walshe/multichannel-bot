"use strict";

const apiai = require('apiai');
const uuid = require('node-uuid');
const async = require('async');
const _ = require('underscore');
const request = require('request');

const APIAI_ACCESS_TOKEN = process.env.APIAI_ACCESS_TOKEN;
const APIAI_LANG = process.env.APIAI_LANG || 'en';

const apiAiService = apiai(APIAI_ACCESS_TOKEN, {
    language: APIAI_LANG,
    requestSource: "fb"
});

const sessionIds = new Map();

exports.test = function(){
    console.log('in apiai.js  test');
}


exports.processText = function(processReplyCallback){


    let sender = arguments[1];
    let text = arguments[2];
    let bot = null;

    console.log("API.AI processing text...", text);


    if(arguments.length = 4){
        bot = arguments[3]
    }
    
    if (!sessionIds.has(sender)) {
        sessionIds.set(sender, uuid.v1());
    }

    let apiaiRequest = apiAiService.textRequest(text,
        {
            sessionId: sessionIds.get(sender)
        });


    apiaiRequest.on('response', ( response) => {
        processReplyCallback(sender, response, bot)
        
    });

    apiaiRequest.on('error', (error) => console.error(error));
    apiaiRequest.end();
    

}





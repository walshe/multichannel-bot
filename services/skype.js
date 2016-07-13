'use strict';

const uuid = require('node-uuid');
const skype = require('skype-sdk');
const _ = require('underscore');
const fs = require('fs');
const request = require('request');
const JSONbig = require('json-bigint');

const SkypeBotConfig = require('./skypebotconfig');

var apiai = require("./apiai");

var db = require('./dummydatabase');

const botConfig = new SkypeBotConfig(
    process.env.APIAI_ACCESS_TOKEN,
    process.env.APIAI_LANG,
    process.env.BOT_ID,
    process.env.APP_ID,
    process.env.APP_SECRET
);


function processReplyCallback(sender, response){

    console.log('in the skype callback');
    if (SkypeBot.isDefined(response.result)) {
        console.log('test a');
        let responseText = response.result.fulfillment.speech;

        console.log("response from api.ai------->"+JSON.stringify(response.result));

        if (SkypeBot.isDefined(responseText)) {
            console.log('test b');
            console.log(sender, 'Response as text message');
            console.log('test c');

            bot.reply(responseText, true, function(){

                console.log('test d');
                let action = response.result.action;
                let actionIncomplete = response.result.actionIncomplete;

                if(action == 'getProductsByLocation' && !actionIncomplete){


                    var city = response.result.parameters['geo-city-us'];
                    var productType = response.result.parameters['product'];

                    var products = [];

                    if(db.data()[productType]){

                        _.each(db.data()[productType], function(product){
                            if(product.city == city){
                                //collect
                                products.push(product);
                            }
                        });

                        if(products){

                            recipientMenuCache[sender] = [];

                            let customText = '';
                            _.each(products, function(product, index){

                                customText += (index+1).toString() + ' - ' +product.name +"\n";

                                recipientMenuCache[sender].push({menuId: (index+1) , productId : product.productId});

                            });

                            customText += "\n\n Enter a number to make a choice e.g. 1"

                            bot.reply(customText, true)


                        }else{
                            bot.reply("Couldn't find any results", true);
                        }

                    }else{
                        bot.reply("Couldn't find any results", true)



                    }


                };
            });

        } else {
            console.log(sender, 'Received empty speech');
        }
    } else {
        console.log(sender, 'Received empty result');
    }
}

class SkypeBot {

    get botConfig() {
        return this._botConfig;
    }

    set botConfig(value) {
        this._botConfig = value;
    }

    get botService() {
        return this._botService;
    }

    set botService(value) {
        this._botService = value;
    }

    get sessionIds() {
        return this._sessionIds;
    }

    set sessionIds(value) {
        this._sessionIds = value;
    }

    constructor(botConfig) {

        this._botConfig = botConfig;

        this._sessionIds = new Map();

        this._botService = new skype.BotService({
            messaging: {
                botId: this.botConfig.skypeBotId,
                serverUrl: "https://apis.skype.com",
                requestTimeout: 15000,
                appId: this.botConfig.skypeAppId,
                appSecret: this.botConfig.skypeAppSecret
            }
        });

        this.botService.on('contactAdded', (bot, data) => {
            console.log("contactAdded", data.from);
        });

        this.botService.on('personalMessage', (bot, data) => {
            console.log('about to call processMessageWithApiAI');
            this.processMessageWithApiAI(bot, data);
            console.log('after call to processMessageWithApiAI');
        });

    }



    processMessageWithApiAI(bot, data) {
        console.log('in processMessageWithApiAI');

        let messageText = data.content;
        let sender = data.from;

        console.log('test1')
        console.log('sender:' + sender)
        console.log('test2')
        if (messageText && sender) {
            console.log('test3')
            console.log(sender, messageText);
            console.log('test4')
            if (!this._sessionIds.has(sender)) {
                this._sessionIds.set(sender, uuid.v1());
            }

            console.log('test5')
            if(/^\d+$/.test(messageText)){
                //user made a menu choice
                //bot.reply("You chose " + messageText +",  thats a great choice", function(){

                console.log("..contents of cache:" + JSON.stringify(recipientMenuCache[sender]));

                _.each(recipientMenuCache[sender], function(menuToProductIdMapping){

                    if(menuToProductIdMapping.menuId.toString() == messageText){

                        let customText = '';

                        _.each(db.data().restaurant, function(restaurant){
                            if(restaurant.productId == Number(messageText)){
                                customText = restaurant.name + ", " +restaurant.city;;

                            }
                        })

                        _.each(db.data().clothing, function(clothingStore){
                            if(clothingStore.productId == Number(messageText)){
                                customText = clothingStore.name + ", " +clothingStore.city;

                            }
                        })

                        if(customText){
                            customText += '   ...excellent choice, let me look for a coupon...';
                        }

                        bot.reply(customText,true, function(){
                            console.log("Sending attachment..");

                            let buffer = fs.readFileSync('./public/UWS/Logo_Restaurants/QR_Code_Coupon/images.png');

                            bot.replyWithAttachment("Result", "Image", buffer, null, function(){
                                console.log("finished sending attachment")
                            });


                        });

                    }

                });



                return;

            }

            console.log('test6')
            apiai.processText(this._sessionIds.get(sender), messageText, processReplyCallback);


        };


    }


    static isDefined(obj) {
        if (typeof obj == 'undefined') {
            return false;
        }

        if (!obj) {
            return false;
        }

        return obj != null;
    }
}

const skypeBot = new SkypeBot(botConfig);


/**
 * use this cache for mapping user menu choices to productIds
 * @type {{}}
 */
var recipientMenuCache =  {

};


exports.processWebhookPost = function(body){

    skypeBot.botService.processMessagingRequest(body);

}






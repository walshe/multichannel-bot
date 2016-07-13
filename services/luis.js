const request = require('request');
const JSONbig = require('json-bigint');



exports.processText = function(callback){

    let sender = arguments[1];
    let text = arguments[2];
    let bot = null;

    console.log("LUIS processing text...", text);

    if(arguments.length = 4){
        bot = arguments[3]
    }


    request({
        url: 'https://api.projectoxford.ai/luis/v1/application?id=29a815c5-3543-4823-8b38-7be8bd113fb0&subscription-key=b33535abc6f9432fba6fa1fd5ace75ed',
        qs: {q: text},
        method: 'GET'
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending processing message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        } else{
            console.log('sending LUIS response back to the callback');
            callback(sender,response, bot);
        }



    });




}
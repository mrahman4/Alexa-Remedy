'use strict';

var CARD_TITLE = "Remedy Line";
var CLOUD = require("aws-sdk");
var tableName = "inquiries";
var docClient = new CLOUD.DynamoDB.DocumentClient();

//CategoryName
var NO_CATEGORY_SELECTED        = 0 ;
var CATEGORY_BONES              = 1 ;
var CATEGORY_STOMACH            = 2 ;

//InquiryStatus
var INQUIRY_NEW                 = 0;
var INQUIRY_WAITING_FOR_ANSWER  = 1;
var INQUIRY_ANSWERED            = 2;

//var REQUESTER_ID                ="";
//var RECOMMENDATION              ="";


exports.handler = (event, context, callback) => {
    // TODO implement
    
    try 
    {
        console.log("Context in handler: " + context);
        
        if (event.session.new) 
        {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest")
        {
            onLaunch(event, event.request, 
                event.session, context , 
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } 
        else if (event.request.type === "IntentRequest")
        {
            onIntent(event,event.request,
                event.session, context ,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } 
        else if (event.request.type === "SessionEndedRequest")
        {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
        
    } 
    catch (e) 
    {
        context.fail("Exception: " + e);
    }
    
    
};


function onSessionStarted(sessionStartedRequest, session)
{
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId
        + " . session.user.userId=" + session.user.userId);
}

function onSessionEnded(sessionEndedRequest, session) 
{
    console.log("onSessionEnded");
}

function buildResponse(sessionAttributes, speechletResponse) 
{
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

function buildSpeechletResponse(title, speechOutput, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            //type: "PlainText",
            //text: output
            type: "SSML",
            ssml: speechOutput
        },
        card: {
            type: "Simple",
            title: title,
            content: repromptText
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
                //type: "SSML",
                //ssml: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            //type: "PlainText",
            //text: output
            type: "SSML",
            ssml: speechOutput
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
                //type: "SSML",
                //ssml: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function onLaunch(event, launchRequest, session, context ,callback) 
{
    console.log("onLaunch");
    getWelcomeResponse( false, event , context , session,  callback);
}

function onIntent(event,intentRequest, session, context , callback) 
{
    console.log("onIntent requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);    
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    if (session.attributes && session.attributes.userPromptedToContinue) {
        delete session.attributes.userPromptedToContinue;
        if ("AMAZON.NoIntent" === intentName) {
            handleFinishSessionRequest("<speak>Have a healthy life. Good bye!</speak>", session, callback);
        } else if ("AMAZON.YesIntent" === intentName) {
            handleRepeatRequest(event , intent, context, session, callback);
        }
    }
    
    if ("MedicalCategoryIntent" === intentName) {
        handleCategorySelect( context , intent, session, callback);
    } else if ("MedicineIntent" === intentName) {
        handleMedicineSelect( context , intent, session, callback);
    } else if ("AnalysisIntent" === intentName) {
        handleAnalysisSelect( context , intent, session, callback);
    } else if ("AMAZON.NoIntent" === intentName) {
        handleFinishSessionRequest("<speak>Have a healthy life. Good bye!</speak>" , session, callback);
    } else if ("AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(false, event , context , session, callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
        handleRepeatRequest(event , intent, context , session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        handleGetHelpRequest(intent, session, callback);
    } else if ("AMAZON.StopIntent" === intentName) {
        handleFinishSessionRequest("<speak>Have a healthy life. Good bye!</speak>" , session, callback);
    } else if ("AMAZON.CancelIntent" === intentName) {
        handleFinishSessionRequest("<speak>Have a healthy life. Good bye!</speak>", session, callback);
    } else {
        throw "Invalid intent";
    }
}

function handleFinishSessionRequest(message , session, callback) {
    
    console.log("Finish session");

    callback(session.attributes,
        buildSpeechletResponseWithoutCard(message, "", true));
}

function handleRepeatRequest(event , intent, context , session, callback) {
    if (!session.attributes || !session.attributes.speechOutput) {
        getWelcomeResponse(true , event , context , session, callback);
    } else {
        callback(session.attributes,
            buildSpeechletResponseWithoutCard(session.attributes.speechOutput, session.attributes.repromptText, false));
    }
}

function handleGetHelpRequest(intent, session, callback) 
{
    if (!session.attributes) {
        session.attributes = {};
    }

    // Set a flag to track that we're in the Help state.
    session.attributes.userPromptedToContinue = true;

    var speechOutput = "<speak> This tool does not provide medical advice, and is for informational and educational purposes only, and is not a substitute for professional medical advice, treatment or diagnosis. Call your doctor to receive medical advice. If you think you may have a medical emergency, please dial 911" 
        + "<break time=\"0.2s\" />This tool is used for one of Alexa contests so Please don't share any personal or real information as this tool is for educational purpose only and will give a dummy feedback"    
        + "<break time=\"0.2s\" />With Remedy Line you can look up inquiries about various categories "
        + "<break time=\"0.2s\" />And you will be able to provide advice for such inquiries that requester can apply" 
        + "Please choose category</speak>";
        
    /*
        var speechOutput = "<speak>" 
        + "<break time=\"0.2s\" />With Remedy Line you can look up inquiries about various categories "
        + "<break time=\"0.2s\" />And you will be able to provide advice for such inquiries that requester can apply" 
        + "Please choose category</speak>";
    
    */
        
    var repromptText = "This tool does not provide medical advice, and is for informational and educational purposes only, and is not a substitute for professional medical advice, treatment or diagnosis. Call your doctor to receive medical advice. If you think you may have a medical emergency, please dial 911" 
        + " This tool is used for one of Alexa contests so Please don't share any personal or real information as this tool is for educational purpose only and will give a dummy feedback."    
        + "With Remedy Line you can look up inquiries about various categories "
        + "And you will be able to provide advice for such inquiries that requester can apply" 
        + "Please choose category";
    
    
    var shouldEndSession = false;
    callback(session.attributes,
        buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession));
}

function getWelcomeResponse(helpFlag , event , context , session, callback)
{
    console.log("New session = " + session.sessionId + " . user ID= " + session.user.userId );
    /*var sessionAttributes = {},
        speechOutput = "Here is Remedy Line",
        shouldEndSession = false,
        repromptText = "Here is Remedy Line";*/
        
        getCategory(false , session, callback); 
        
   // callback(sessionAttributes, buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function getCategory(helpFlag , session, callback)
{
    console.log("Category Selection");
    
    var sessionAttributes = {};
    var speechOutput; 
    var repromptText;
    var shouldEndSession = false;
        
    speechOutput = "<speak>This tool does not provide medical advice, and is for informational and educational purposes only, and is not a substitute for professional medical advice, treatment or diagnosis. Call your doctor to receive medical advice. If you think you may have a medical emergency, please dial 911" 
        + "This tool is used for one of Alexa contests so Please don't share any personal or real information as this tool is for educational purpose only and will give a dummy feedback"
        +"Please choose category";
    
    repromptText = "This tool does not provide medical advice, and is for informational and educational purposes only, and is not a substitute for professional medical advice, treatment or diagnosis. Call your doctor to receive medical advice. If you think you may have a medical emergency, please dial 911" 
        + "This tool is used for one of Alexa contests so Please don't share any personal or real information as this tool is for educational purpose only and will give a dummy feedback."
        + "Please choose category";
    
    if(helpFlag) {
        speechOutput += "You can say Bones or Stomach";
    }
    speechOutput += "</speak>";
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        //"patientName"   : session.attributes.patientName ,
        //"patientCase"   : session.attributes.patientCase
        };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handleCategorySelect(context, intent, session, callback) 
{
    var category = NO_CATEGORY_SELECTED;
    var patientCase = null;
    
    if( intent.slots && intent.slots.Category && intent.slots.Category.value )
    { 
        category = intent.slots.Category.value.toString().toLowerCase().trim();
        
    }
    else if( intent.slots && intent.slots.Category  )
    {
        category = intent.slots.Category.toString().toLowerCase().trim();        
    }
    
    console.log(JSON.stringify(intent.slots));
    
    if (category === "bones")
    {
        category = CATEGORY_BONES;
    }
    else if (category === "stomach")
    {
        category = CATEGORY_STOMACH;
    }
    
    if( category !== NO_CATEGORY_SELECTED )
    {
        console.log("Category Selected: " + category);
        getPatientCase(category, context ,  session,  function(userID, patientCase){
                console.log("user ID = " + userID );
                console.log("Patient case = " + patientCase );
                context.succeed(getRecommendedMedicine(userID, patientCase , context, session, callback));
        });
        
    }
    else
    {
        console.log("Undefined Category Selected");
        getCategory(true , session, callback);
    }
}

function getPatientCase(category, context, session, callback)
{
    
    var userID = "";
    var patientCase = "";
    
    var params = {
        TableName: tableName,
        ProjectionExpression: "userID, info.patientCase",
        //KeyConditionExpression: "inquiryStatus = :flag and categoryType = :cat",
        FilterExpression: "info.inquiryStatus = :flag and info.categoryType = :cat",
        ExpressionAttributeValues: {
        ":flag":INQUIRY_WAITING_FOR_ANSWER,
        ":cat":category
        }
    };
    
    console.error("Inside handleInquiries function");
    console.error("param = " , params);
    
    
    try
    {
        docClient.scan(params, function(err, data) {
            if (err)
            {
                console.error("Unable to read patient case. Error JSON:", JSON.stringify(err, null, 2));
            } 
            else
            {
                console.log("Get  patient case from DB succeeded:", JSON.stringify(data, null, 2));
                data.Items.forEach(function(i) {userID = i.userID; patientCase = i.info.patientCase;});
                /*if(data.Item ) {
                    for(var item in data){
                        userID = item.userID;
                        var Info = data[item] ;
                        for(var info in Info){
                            var elements = Info[info];
                            for(var element in elements){
                                console.log(element+": "+elements[element]);
                                patientCase = elements[element];
                            }
                        }
                    }
                } 
                else
                {
                    //context.done(null, {});
                }*/
            }
            
            callback(userID , patientCase);
            
        });
    }
    catch (err1)
    {
       console.error("readPatientCase. Error JSON:", JSON.stringify(err1, null, 2)); 
    }
    
    return patientCase ;
}

/*
function handlePatientCase(userID , patientCase, context, session, callback)
{    
    console.log("Patient Case");
    
    var sessionAttributes = {};
    var speechOutput; 
    var repromptText;
    var shouldEndSession = false;
        
    speechOutput = "<speak>" + patientCase + "</speak>";
    repromptText = patientCase;
    
    session.attributes.patientID    = userID;
    session.attributes.patientCase  = patientCase;
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        "patientID"   : session.attributes.patientID ,
        "patientCase"  : session.attributes.patientCase
        };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}
*/
function getRecommendedMedicine(patientID, patientCase, context, session, callback)
{    
    console.log("Medicine Recommendation");
    
    var sessionAttributes = {};
    var speechOutput; 
    var repromptText;
    var shouldEndSession;
    var doctorFeedback;
    
    if(patientCase !== "")
    {
        console.log("case found");
    
        shouldEndSession = false; 
        speechOutput = "<speak>" + patientCase + " Which medicine do you advice?</speak>";
        repromptText = patientCase + " Which medicine do you advice?";
    
        sessionAttributes = {
            "speechOutput": speechOutput,
            "repromptText": repromptText,
            "patientID"   : patientID ,
            "patientCase"   : patientCase,
            "doctorFeedback" : doctorFeedback,
            };
        
        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
    }
    else
    {
        console.log("no case found");
    
        //no record founds
        shouldEndSession = true; 
        callback(sessionAttributes,
            handleFinishSessionRequest("<speak> No cases found. bye </speak>", session, callback));
            
    }
    
}


function handleMedicineSelect(context, intent, session, callback) 
{
    var medicine = null;
    
    if( intent.slots && intent.slots.Medicine && intent.slots.Medicine.value )
    { 
        medicine = intent.slots.Medicine.value.toString().toLowerCase().trim();
        
    }
    else if( intent.slots && intent.slots.Medicine  )
    {
        medicine = intent.slots.Medicine.toString().toLowerCase().trim();        
    }
    
    session.attributes.doctorFeedback = "Using " + medicine + " is recommended" + " . <break time=\"0.2s\" />" ;
    
    getRecommendedAnalysis(session, callback);
    
}

function getRecommendedAnalysis (session, callback)
{    
    console.log("Analysis Recommendation");
    
    var sessionAttributes = {};
    var speechOutput; 
    var repromptText;
    var shouldEndSession = false;
        
    speechOutput = "<speak>Which analysis do you advice?</speak>";
    repromptText = "Which analysis do you advice?";
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        "patientID"   : session.attributes.patientID,
        "patientCase"   : session.attributes.patientCase,
        "doctorFeedback": session.attributes.doctorFeedback 
    };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handleAnalysisSelect(context, intent, session, callback) 
{
    var analysis = null;
    
    if( intent.slots && intent.slots.Analysis && intent.slots.Analysis.value )
    { 
        analysis = intent.slots.Analysis.value.toString().toLowerCase().trim();
        
    }
    else if( intent.slots && intent.slots.Analysis  )
    {
        analysis = intent.slots.Analysis.toString().toLowerCase().trim();        
    }
    
    console.log("Feedback before analysis: " + session.attributes.doctorFeedback);
    session.attributes.doctorFeedback += " Analysis required is: " + analysis + " . " ;
    
    updatePatientCase(context, session, function()
        {
            console.log("Update patient Info in DB.");
            context.succeed(handleFinishSessionRequest("<speak>Advice is recorder. Have a healthy life. Good bye!</speak>" , session, callback));
        });
}

function updatePatientCase(context , session, callback)
{
    console.log("Update patient ID: " + session.attributes.patientID);
    var params = {
        TableName: tableName,
        Key:{
            "userID": session.attributes.patientID
        },
        UpdateExpression: "set info.doctorFeedback = :f, info.inquiryStatus=:i",
        ExpressionAttributeValues:{
            ":f":session.attributes.doctorFeedback,
            ":i":INQUIRY_ANSWERED
        },
        ReturnValues:"UPDATED_NEW"
    };
    
    console.log("Updating patient case ...");
    docClient.update(params, function(err, data) {
        if (err)
        {
            console.log("Unable to update patient case. Error JSON:", JSON.stringify(err, null, 2));
        } 
        else
        {
            console.info("Update patient case succeeded:", JSON.stringify(data, null, 2));
        }
        
        callback();        
    });
    
}




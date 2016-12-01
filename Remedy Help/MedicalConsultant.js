

'use strict';

var AWS = require("aws-sdk");
//AWS.config.update({region: 'us-east-1'});

var CARD_TITLE = "Remedy Help"; // Be sure to change this for your skill.

var tableName = "inquiries";
//var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
var docClient = new AWS.DynamoDB.DocumentClient();

//CategoryName
var NO_CATEGORY_SELECTED        = 0 ;
var CATEGORY_BONES              = 1 ;
var CATEGORY_STOMACH            = 2 ;

//InquiryStatus
var INQUIRY_NEW                 = 0;
var INQUIRY_WAITING_FOR_ANSWER  = 1;
var INQUIRY_ANSWERED            = 2;


    
    
exports.handler = (event, context, callback) => {
    
    try 
    {
        /*
        console.log("event.session.application.applicationId=" + event.session.application.applicationId + 
        " . event.session.sessionId=" + event.session.sessionId +
        " . event.session.user.userId=" + event.session.user.userId);
        */
        
        console.info("context in handler" + context);
        
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

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session)
{
    console.info("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId
        + " . session.user.userId=" + session.user.userId);

    // add any session init logic here
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) 
{
    console.log("onSessionEnded");

    // Add any cleanup logic here
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


/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(event, launchRequest, session, context ,callback) 
{
    console.log("onLaunch");

    prepareWelcomeResponse( false, event , context , session,  callback);
}




function onIntent(event,intentRequest, session, context , callback) 
{
    
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;
    
    console.info("intent name = " + intentName );
    console.info("context = " + context );
    
    // handle yes/no intent after the user has been prompted
    if (session.attributes && session.attributes.userPromptedToContinue) {
        delete session.attributes.userPromptedToContinue;
        if ("AMAZON.NoIntent" === intentName) {
            handleFinishSessionRequest("<speak>Have a healthy life. Good bye!</speak>" , session, callback);
        } else if ("AMAZON.YesIntent" === intentName) {
            handleRepeatRequest(event , intent, context, session, callback);
        }
    }
    
    
    // dispatch custom intents to handlers here
    if ("PatientNameQuestionIntent" === intentName) {
        handlePatientNameRequest( context , intent, session, callback);
    } else if ("PatientInfoQuestionIntent" === intentName) {
        handlePatientInfoRequest(context , intent, session, callback);
    } else if ("DateQuestionIntent" === intentName) {
        handleDateQuestionRequest( context , intent, session, callback);
    } else if ("MedicalCategoryIntent" === intentName) {
        handleCategoryRequest( context , intent, session, callback);
    } else if ("SPainTypeQuestionIntent" === intentName) {
        handleStomachQ1( context , intent, session, callback);
    }  else if ("SRadiateQuestionIntent" === intentName) {
        handleStomachQ2( context , intent, session, callback);
    } else if ("BJointQuestionIntent" === intentName) {
        handleBonesQ1( context , intent, session, callback);
    }  else if ("BPainWorseQuestionIntent" === intentName) {
        handleBonesQ2( context , intent, session, callback);
    }  
    
    
    else if ("DontKnowIntent" === intentName) {
        handleGetHelpRequest(intent, session, callback);
    } else if ("AMAZON.NoIntent" === intentName) {
        handleFinishSessionRequest("<speak>Have a healthy life. Good bye!</speak>" , session, callback);
    } else if ("AMAZON.StartOverIntent" === intentName) {
        prepareWelcomeResponse(false, event , context , session, callback);
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
    // Repeat the previous speechOutput and repromptText from the session attributes if available
    // else start a new game session
    if (!session.attributes || !session.attributes.speechOutput) {
        prepareWelcomeResponse(true , event , context , session, callback);
    } else {
        callback(session.attributes,
            buildSpeechletResponseWithoutCard(session.attributes.speechOutput, session.attributes.repromptText, false));
    }
}

function handleGetHelpRequest(intent, session, callback) 
{
    // Ensure that session.attributes has been initialized
    if (!session.attributes) {
        session.attributes = {};
    }

    // Set a flag to track that we're in the Help state.
    session.attributes.userPromptedToContinue = true;

    var speechOutput = "<speak>This tool does not provide medical advice, and is for informational and educational purposes only, and is not a substitute for professional medical advice, treatment or diagnosis. Call your doctor to receive medical advice. If you think you may have a medical emergency, please dial 911" 
    + "<break time=\"0.2s\" />This tool is used for one of Alexa contests so Please don't share any personal or real information as this tool is for educational purpose only and will give a dummy feedback"
    + "<break time=\"0.2s\" />This skill make a connection between patient and remedy service"
    + "User can add new  inquiry" 
    + "<break time=\"0.2s\" /> or check remedy service feedback for the his old inquiry. " 
    + "In case of new inquiry, patient should answer questions related to his age, when he felt this pain"
    + "<break time=\"0.1s\" />and based on category of pain, he sould answer some other questions. " 
    + "Please say menu to start?</speak>";
            
    var repromptText = "This tool does not provide medical advice, and is for informational and educational purposes only, and is not a substitute for professional medical advice, treatment or diagnosis. Call your doctor to receive medical advice. If you think you may have a medical emergency, please dial 911" 
    + " This tool is used for one of Alexa contests so Please don't share any personal or real information as this tool is for educational purpose only and will give a dummy feedback."
    + "This skill make a connection between patient and remedy service. "
    + "User can add new  inquiry." 
    + "or check remedy service feedback for the his old inquiry." 
    + "In case of new inquiry, patient should answer questions related to his age, when he felt this pain"
    + "and based on category of pain, he sould answer some other questions." 
    + "Please say menu to start?";
    
    console.log("Help function" + speechOutput +  repromptText );
    
    var shouldEndSession = false;
    callback(session.attributes,
        buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession));
        
        
    
}


//-----Handle DataBase functions
/*
function insertInquryDetailesTable(context , userId, question_answer, categoryType, inquiryStatus)
{
    var patientCase = readPatientCase(context , userId, 
        function (data) {
                            console.log("inside Call back. Data = "+data);
                            context.succeed(data);
        });
    
    if (patientCase !== "" && patientCase !== " ")
        patientCase = question_answer ;
    else
        patientCase += " . " + question_answer ;
    
    console.log("inside the function patientCase = "+ patientCase );    
    updatePatientCase(context , userId , patientCase ,categoryType, inquiryStatus,
        function (data) {
                            console.log("inside Call back. Data = "+data);
                            context.succeed(data);
        });
}


function updatePatientCase(context , userID , patientCase ,categoryType, inquiryStatus, callback)
{
    //var docClient = new AWS.DynamoDB.DocumentClient();
    
    var params = {
        TableName: tableName,
        Key:{
            "userID": userID
        },
        UpdateExpression: "set info.patientCase = :p, info.categoryType=:c, info.inquiryStatus=:i",
        ExpressionAttributeValues:{
            ":p":patientCase,
            ":c":categoryType,
            ":i":inquiryStatus
        },
        ReturnValues:"UPDATED_NEW"
    };
    
    console.log("Updating patient case ...");
    docClient.update(params, function(err, data) {
        if (err)
        {
            console.log("Unable to update patient case. Error JSON:", JSON.stringify(err, null, 2));
            //context.done('Unable to retrieve doctor feedback', null);
        } 
        else
        {
            console.info("Update patient case succeeded:", JSON.stringify(data, null, 2));
            //context.done(null, data.Item);
        }
        
    });
    
}

function readPatientCase(context , userID, callback)
{
    var patientCase = "";
    //var docClient = new AWS.DynamoDB.DocumentClient();
    
    var params = {
        TableName: tableName,
        Key: {
            "userID": userID
        },
        ProjectionExpression: "info.patientCase"
    };
    
    console.error("Inside readPatientCase function");
    console.error("param = " , params);
    
    
    try
    {
        docClient.get(params, function(err, data) {
            
            
            if (err)
            {
                console.error("Unable to read patient case. Error JSON:", JSON.stringify(err, null, 2));
                //context.done('Unable to retrieve patient case from DB', null);
            } 
            else
            {
                console.info("Get  patient case from DB succeeded:", JSON.stringify(data, null, 2));
                if(data.Item ) {
                    
                    for(var item in data){
                        var Info = data[item] ;
                        for(var info in Info){
                            var elments = Info[info];
                            for(var elment in elments){
                                console.log(elment+": "+elments[elment]);
                                patientCase = elments[elment];
                            }
                        }
                    }
                    
                    //context.done(null, data.Item);
                } 
                else
                {
                    //context.done(null, {});
                }
                
                 
            }
            
        });
    }
    catch (err1)
    {
       console.error("readPatientCase. Error JSON:", JSON.stringify(err1, null, 2)); 
    }
    
    return patientCase ;
}


function readWritefromFile(event , context)
{
    var fs = require('fs');
    var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
    
    console.log("-----1");
    console.log(JSON.stringify(event));
    
    //var bucket = event.Records[0].s3.bucket.name;
    var pass = "S3User,,AKIAJ3EFDLTTJKUHSQBA,EDQgZAWZ0YHZzAnFzmByzZm4suuYBi4+ex0cWsQG" ;
    var Key = decodeURIComponent(pass.replace(/\+/g, ' '));
    
    var params = {
        Bucket: "medicalconsultant",
        Key: Key
    };
    
    s3.getObject(params, function(err, data) {
        console.log("-----2");
        if (err) {
            console.log(err);
            var message = "Error getting object from bucket "  +
            ". Make sure they exist and your bucket is in the same region as this function.";
            console.log(message);
            context.fail(message);
        } else {

            console.log("-----3");
            console.log("DATA: " + data.Body.toString());
            fs.writeFile("/test.json", "testing", function (err) {
                console.log("-----1");
                if(err) {
                    context.fail("writeToTmp Failed " + err);
                } else {
                    context.succeed("writeFile succeeded");
                }
            });
        }
    });
    
    console.log("-----4");
    
    fs.readFile("/test.json", function (err, data) {
        if(err) {
            console.log("-----5" + err);
            //context.fail("ReadFromTmp Failed " + err);
        } 
        else {
            console.log("-----6" + data );
            //context.succeed("ReadFromTmp succeeded");
        }
        console.log("-----7");
    });
    
    console.log("-----8");
}


function insertPatientInquiryInTable(context , userID , session)
{
    //Table InquiriesTable (UserId, patientName, inquiryDate, serviceType,  categoryType , patientCase, doctorFeedback, inquiryStatus )

    //var docClient = new AWS.DynamoDB.DocumentClient();

    var params = {
        TableName: "InquiriesTable",
        Item:{
            "userID": userID,
            "info":{
                "patientName"   : session.attributes.patientName ,
                "categoryType"  : session.attributes.painCategory,
                "patientCase"   : session.attributes.patientCase,
                "doctorFeedback": " ",
                "inquiryStatus" : INQUIRY_WAITING_FOR_ANSWER
            }
        }
    };    
    
    console.log("Adding patient Inguiry in DB...");
    docClient.put(params, function(err, data) {
        
        if (err)
        {
            console.error("Unable to add inquiry. Error JSON:", JSON.stringify(err, null, 2));
            //context.done('Unable to retrieve doctor feedback', null);
        } 
        else
        {
            console.info("inquiry Added:", JSON.stringify(data, null, 2));
            //context.done(null, data.Item);
        }
    });
    
}

*/

function deleteInquiryFromTable( context , userID , callback)
{
    var params = {
        TableName:tableName,
        Key:{
            "userID": userID 
        }
    };    
    
    console.log("delete Inquiry from DB..." + JSON.stringify(params));
    docClient.delete(params, function(err, data) {
        console.log("docClient.delete");
        
        if (err)
        {
            console.error("Unable to delete inquiry. Error JSON:", JSON.stringify(err, null, 2));
        } 
        else
        {
            console.info("Delete Inquiry succeeded:", JSON.stringify(data, null, 2));
        }
        
        callback();
        //context.succeed();
    });
    
    console.log("at the end of deleteInquiryFromTable");
}


function isOldInquiryInTable( userID , callback)
{
    var doctorFeedback =""; 
    
    var params = { 
        TableName: tableName,
        Key: {
            "userID": userID
        },
        ProjectionExpression: "info.doctorFeedback"
    };

    console.log("Before read doctor feedback... ");
    
    docClient.get(params, function(err, data) {
        console.log("inside docClient.get to read doctor feedback");
        
        if (err)
        {
            console.log("Get doctor feedback from DB error: " + JSON.stringify(err));
        } 
        else
        {
            console.info("Get doctor feedback from DB succeeded:", JSON.stringify(data, null, 2));
            if(data.Item ) {
                
                for(var item in data){
                    var Info = data[item] ;
                    for(var info in Info){
                        var elments = Info[info];
                        for(var elment in elments){
                            console.log(elment+": "+elments[elment]);
                            doctorFeedback = elments[elment];
                            console.log("doctorFeedback"+ doctorFeedback);
                        }
                    }
                }
            } 
        }
        
        callback(doctorFeedback);
    });
    
    console.log("at the end of isOldInquiryInTable function");
}



function insertNewInquiryInTable(context , session , callback)
{
    console.log("patient Info = " + JSON.stringify(session.attributes));
    
    var params = {
        TableName: tableName,
        Item:{
            "userID": session.user.userId,
            "info":{
                "patientName"   : session.attributes.patientName ,
                "categoryType"  : session.attributes.painCategory,
                "patientCase"   : session.attributes.patientCase,
                "doctorFeedback": " ",
                "inquiryStatus" : INQUIRY_WAITING_FOR_ANSWER
            }
        }
    };    
    
    console.log("Adding new Inguiry in DB...");
    docClient.put(params, function(err, data) {
        
        if (err)
        {
            console.error("Unable to add inquiry. Error JSON:", JSON.stringify(err, null, 2));
        } 
        else
        {
            console.info("inquiry Added:", JSON.stringify(data, null, 2));
        }
        
        callback();
    });
    
    console.log("at the end of insertNewInquiryInTable function");
}


//-----------handle  custom intent

function prepareWelcomeResponse(helpFlag , event , context , session, callback)
{
    console.info("Welcome for New session = " + session.sessionId + " . user ID= " + session.user.userId );
    
    isOldInquiryInTable(session.user.userId , 
        function (data) {
                            console.log("inside Call back of isOldInquiryInTable.  Data = "+data);
                            context.succeed(isOldInquiryInTableSync(data, context , session , callback));});
    
    console.info("last line in welcome");    
}

function isOldInquiryInTableSync(doctorFeedback , context , session , callback )
{
    console.info("doctorFeedback = " + doctorFeedback);
    
    if( doctorFeedback === " " )
    {
        //old unasnwered inquiry
        prepareUnansweredInquiry(callback);
    }
    if( doctorFeedback === "" )
    {
        //New request. Take new Inquiry
        preparePatientNameRequest(false , session, callback);
    }
    else
    {
        
        console.log("delete answered inquiry. context = " + context);
        deleteInquiryFromTable(context , session.user.userId,
            function () {
                    
                    console.log("inside Call back of deleteInquiryFromTable.");
                    context.done();
                    
            });
            
            prepareStatusMessages( doctorFeedback , session, callback);
    }
    
    console.info("end of inside isOldInquiryInTableSync fn");
    
}

function prepareUnansweredInquiry(callback)
{
    console.log("prepareUnansweredInquiry");
    
    var sessionAttributes = {},
        shouldEndSession = true ,
        speechOutput = "<speak> This tool does not provide medical advice, and is for informational and educational purposes only, and is not a substitute for professional medical advice, treatment or diagnosis. Call your doctor to receive medical advice. If you think you may have a medical emergency, please dial 911"
        + "<break time=\"0.2s\" />This tool is used for one of Alexas contest so Please don't share any personal or real information as this tool is for educational purpose only and will give a dummy feedback"
        +"<break time=\"0.2s\" /> Dear Patient, You have unanswered inquiry right now. <break time=\"0.2s\" /> Please check back later with Alexa for remedy service feedback. "
        + " Have a healthy life. see you soon! <break time=\"0.2s\" /> bye."
        + "</speak>";
        
        
        /*speechOutput = "<speak>"
        +"<break time=\"0.2s\" /> Dear Patient, You have unanswered inquiry right now. <break time=\"0.2s\" /> Please check back later with Alexa for remedy service feedback. "
        + " Have a healthy life. see you soon! <break time=\"0.2s\" /> bye."
        + "</speak>";*/
        
        
    var repromptText = "This tool does not provide medical advice, and is for informational and educational purposes only, and is not a substitute for professional medical advice, treatment or diagnosis. Call your doctor to receive medical advice. If you think you may have a medical emergency, please dial 911"
        + " This tool is used for one of Alexa contests so Please don't share any personal or real information as this tool is for educational purpose only and will give a dummy feedback."
        + " Dear Patient, You have unanswered inquiry right now. Please check back later with Alexa for remedy service feedback. "
        + " Have a healthy life. see you soon! bye.";    
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function preparePatientNameRequest(helpFlag, session, callback)
{
    console.log("Prepare Patient Name Request");
    
    var sessionAttributes = {},
        speechOutput = "<speak>This tool does not provide medical advice, and is for informational and educational purposes only, and is not a substitute for professional medical advice,"
                        + "<break time=\"0.2s\" />treatment or diagnosis. Call your doctor to receive medical advice. If you think you may have a medical emergency, please dial 911" 
                        + "<break time=\"0.2s\" />This tool is used for one of Alexa contests so Please don't share any personal or real information as this tool is for educational purpose only and will give a dummy feedback"
                        + "<break time=\"0.3s\" /> Dear Patient, <break time=\"0.2s\" /> what is your first name ? ",
        
        /*speechOutput = "<speak>"
                        + "<break time=\"0.3s\" /> Dear Patient, <break time=\"0.2s\" /> what is your first name ? ",*/
        
        
        shouldEndSession = false;
        
    
    if(helpFlag)
    {
        speechOutput += "<break time=\"0.2s\" /> for example say, <break time=\"0.3s\" /> my name is Mohamed" ;
    }
    
    speechOutput += "</speak>";
    
    var repromptText = "This tool does not provide medical advice, and is for informational and educational purposes only, and is not a substitute for professional medical advice,"
                        + "treatment or diagnosis. Call your doctor to receive medical advice. If you think you may have a medical emergency, please dial 911" 
                        + "This tool is used for one of Alexa contests so Please don't share any personal or real information as this tool is for educational purpose only and will give a dummy feedback."
                        + "Dear Patient, what is your first name ? ";
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        };
    
    
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handlePatientNameRequest( context , intent, session, callback) 
{
    console.log("Handle Patient Name Request");
    
    var patientName = "" ;
    
    if( intent.slots && intent.slots.PatientName && intent.slots.PatientName.value )
    {
        patientName = intent.slots.PatientName.value ;
    } else if( intent.slots && intent.slots.PatientName  )
    {
        patientName = intent.slots.PatientName ;
    }
    
    if( patientName !== "" )
    {
        console.info("patient name = " + patientName );
        session.attributes.patientName = "Patient name is " +  patientName + " . ";
        //insertNewInquiryInTable(context , session.user.userId , patientName);
        
        //Ask Patient about service he wants
        preparePatientInfoMessages(false, session, callback);
    }
    else
    {
        preparePatientNameRequest(true, session, callback);
    }
}


function prepareStatusMessages(doctorFeedback , session,  callback)
{
    console.log("Prepare Status Message");
    
    //close the session
    doctorFeedback = "<speak> This tool does not provide medical advice, and is for informational and educational purposes only, and is not a substitute for professional medical advice, treatment or diagnosis. Call your doctor to receive medical advice. If you think you may have a medical emergency, please dial 911" 
                + "<break time=\"0.2s\" /> This tool is used for one of Alexa contest so Please don't share any personal or real information as this tool is for educational purpose only and will give a dummy feedback"
                + "<break time=\"0.2s\" /> Remedy service feedback is <break time=\"0.2s\" /> "+ doctorFeedback ;
    
    
    
    /*doctorFeedback = "<speak>" 
                + "<break time=\"0.2s\" /> Remedy service feedback is <break time=\"0.2s\" /> "+ doctorFeedback ;*/
    
    
    
    handleFinishSessionRequest(doctorFeedback + "<break time=\"0.2s\" /> Have a healthy life. see you soon! bye.</speak>" , session, callback);   
}


function preparePatientInfoMessages(helpFlag , session, callback)
{
    console.log("Prepare Patient Info");
    
    
    var sessionAttributes = {},
        speechOutput = "<speak> What is your age?",
        shouldEndSession = false;
    
    if(helpFlag)
    {
            speechOutput += "<break time=\"0.2s\" /> for example say : <break time=\"0.3s\" /> I've 40 years old.";
    }
    
    speechOutput += "</speak>" ; 
    
    var repromptText = "What is your age?";
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        "patientName"   : session.attributes.patientName ,
        };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handlePatientInfoRequest( context, intent, session, callback) 
{
    console.log("Handle Patient Info");
    
    var patientAge ;
    
    console.info("intent.slots.PatientAge = " + intent.slots.PatientAge );
    console.info("intent.slots.PatientAge.value = " + intent.slots.PatientAge.value );
    
    if( intent.slots && intent.slots.PatientAge && intent.slots.PatientAge.value )
    {
        patientAge = intent.slots.PatientAge.value ;

    } else if( intent.slots && intent.slots.PatientAge)
    {
        patientAge = intent.slots.PatientAge.value ;

    }
    
    if ( patientAge !== "" )
    {
        console.info("Patient Age = " + patientAge );
        session.attributes.patientCase = "age is " +  patientAge + " .  ";
        //insertInquryDetailesTable(context, session.user.userId , "Patient age is " +  patientAge , NO_CATEGORY_SELECTED , INQUIRY_NEW);
        
        
        //Ask patient since when he feel the pain 
        prepareDateQuestion(false , session, callback);
    }
    else
    {
        console.error("Couldn't read Patient Age = " + intent.slots.PatientAge.value );
        preparePatientInfoMessages(true, session, callback);
    }
}

function prepareDateQuestion(helpFlag , session , callback)
{
    console.log("Prepare Date Question");
    
    var sessionAttributes = {};
    var speechOutput ; 
    var shouldEndSession = false;
        
    speechOutput = "<speak> Since when you feel this pain?";
    
    if(helpFlag)
    {
        speechOutput += " <break time=\"0.2s\" /> for example say : <break time=\"0.2s\" /> since 10 minutes.";
    }
    
    speechOutput += " </speak>" ;
    
    var repromptText = "Since when you feel this pain?";
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        "patientName"   : session.attributes.patientName ,
        "patientCase"   : session.attributes.patientCase
        };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handleDateQuestionRequest(  context, intent, session, callback)
{
    console.log("Handle Date Question");
    
    //this happen after user to choose to record new inquiry and before he listen to categories
    var sinceWhen = "" ;
    
    if( intent.slots && intent.slots.SinceDuration && intent.slots.SinceDuration.value )
    {
        sinceWhen = intent.slots.SinceDuration.value;
    }
    else if( intent.slots && intent.slots.SinceDuration  )
    {
        sinceWhen = intent.slots.SinceDuration;
    }
    
    //update DB with this info
    if ( sinceWhen !== "" )
    {
        console.info("Pain since = " + sinceWhen );
        session.attributes.patientCase += "Patient  felt the pain " + sinceWhen + " . " ;
        //insertInquryDetailesTable(context, session.user.userId, "Patient has felt the pain since " + sinceWhen , NO_CATEGORY_SELECTED , INQUIRY_NEW);    
        
        //list categories we have
        prepareCategoryMessgae(false , session, callback);   
    }
    else
    {
        prepareDateQuestion(true , session, callback);
    }
    
}

function prepareCategoryMessgae(helpFlag , session, callback)
{
    console.log("Prepare Category Message");
    
    var sessionAttributes = {};
    var speechOutput ; 
    var shouldEndSession = false;
        
    speechOutput = "<speak>which area you feel pain in: bones or stomach?";
    
    if(helpFlag)
    {
        speechOutput += "<break time=\"0.2s\" /> for example say : <break time=\"0.3s\" /> I feel pain in my stomach.";
    }
    
    speechOutput += "</speak>";
    
    var repromptText = "which area you feel pain in: bones or stomach?";
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        "patientName"   : session.attributes.patientName ,
        "patientCase"   : session.attributes.patientCase
        };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handleCategoryRequest(  context, intent, session, callback) 
{
    console.log("Handle Category Message");
    
    var categoryType = "";
    
    if( intent.slots && intent.slots.Category && intent.slots.Category.value )
    { 
        categoryType = intent.slots.Category.value.toString().toLowerCase().trim();
        
    }
    else if( intent.slots && intent.slots.Category  )
    {
        categoryType = intent.slots.Category.toString().toLowerCase().trim();        
    }
    
    console.log("User choose Category = " + categoryType );
    
    
    if (categoryType === "bones")
    {
        prepareBonesQ1( false , session, callback);
    }
    else if (categoryType === "stomach")
    {
        prepareStomachQ1(false ,  session, callback);
    }
    else
    {
        console.error("choose wrong category type");
        prepareCategoryMessgae(true , session, callback);
    }
}

//---------Bones Questions
function prepareBonesQ1(helpFlag , session, callback)
{
    console.log("Prepare Bones Q1");
    
    //Do you have pain in one or multiple joints?
    
    var sessionAttributes = {};
    var speechOutput ; 
    var shouldEndSession = false;
        
    speechOutput = "<speak> How many joints you have bain in? <break time=\"0.2s\" /> multiple joints <break time=\"0.1s\" /> or one joint. ";
    
    if(helpFlag)
    {
        speechOutput += " <break time=\"0.2s\" /> Your answer should be : <break time=\"0.3s\" /> single joint <break time=\"0.1s\" /> or <break time=\"0.1s\" /> multiple joints.";
    }
    
    speechOutput += " </speak> ";
    
    var repromptText = "How many joints you have bain in? multiple joints  or one joint. ";
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        "patientName"   : session.attributes.patientName ,
        "patientCase"   : session.attributes.patientCase
        };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));

}

function handleBonesQ1(  context, intent, session, callback)
{
    var BJointType = "";
    
    console.info("handleBonesQ1" + JSON.stringify(session.attributes));
    
    //Do you have pain in one or multiple joints?
    if( intent.slots && intent.slots.BJointType && intent.slots.BJointType.value )
    {
        BJointType = intent.slots.BJointType.value ; 
        
    } else if( intent.slots && intent.slots.BJointType )
    {
        BJointType = intent.slots.BJointType ; 
    }
    
    if( BJointType !== "" )
    {
        session.attributes.patientCase += "affected joints " + BJointType + " . " ;
        
        //insertInquryDetailesTable(context, session.user.userId , "Number of affected joints " + intent.slots.BJointType  , CATEGORY_BONES, INQUIRY_NEW );
        console.info("Number of affected joints = " + BJointType  );
        
        prepareBonesQ2(false, session, callback) ;
        
    }
    else
    {
        prepareBonesQ1(true , session, callback);
    }
}

function prepareBonesQ2(helpFlag , session,  callback)
{
    console.log("Prepare Bones Q2");
    
    //Does your pain feel worse at rest, or at night?
    var sessionAttributes = {};
    var speechOutput ; 
    var shouldEndSession = false;
        
    speechOutput = "<speak> When pain feel worst: at rest <break time=\"0.1s\" /> or at night?";
    
    if(helpFlag)
    {
        speechOutput += " <break time=\"0.2s\" /> Your answer should be : <break time=\"0.3s\" /> at rest <break time=\"0.1s\" /> or <break time=\"0.1s\" /> at night";
    }
    
    speechOutput += " </speak>";
    
    var repromptText = "When pain feel worst: at rest or at night?";
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        "patientName"   : session.attributes.patientName ,
        "patientCase"   : session.attributes.patientCase
        };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
        
}

function handleBonesQ2(  context, intent, session, callback)
{
    var BWorseTimeType = "" ;
    console.info("handleBonesQ2" + JSON.stringify(session.attributes));
    
    //Does your pain feel worse at rest, or at night?
    if( intent.slots && intent.slots.BWorseTimeType && intent.slots.BWorseTimeType.value )
    {
        BWorseTimeType = intent.slots.BWorseTimeType.value ;
    
    } else if( intent.slots && intent.slots.BWorseTimeType )
    {
        BWorseTimeType = intent.slots.BWorseTimeType ;
    } 
    
    if( BWorseTimeType !== "")
    {
        session.attributes.painCategory = CATEGORY_BONES ;
        session.attributes.patientCase += "Pain worse at " +  BWorseTimeType + " . " ;
        
        //insertInquryDetailesTable(context, session.user.userId , "Pain feel worse at " + intent.slots.BWorseTimeType.value , CATEGORY_BONES, INQUIRY_WAITING_FOR_ANSWER );
        //insertPatientInquiryInTable(context, session.user.userId , session);
        
        insertNewInquiryInTable(context , session , function(){
            console.log("inside Call back of insertNewInquiryInTable.");
            context.succeed(handleFinishSessionRequest("<speak>Your case is recorded. remedy service feedback will be delivered in 24 hours. bye.</speak>", session, callback));
        });
        
    }
    else
    {
        prepareBonesQ2(true, session, callback);
    }
    
}

//-----Stomach Questions
function prepareStomachQ1(helpFlag , session, callback)
{
    console.log("Prepare Stomach Q1");
    
    var sessionAttributes = {};
    var speechOutput ; 
    var shouldEndSession = false;
        
    speechOutput = "<speak> What type of pain are you experiencing? <break time=\"0.1s\" /> Is it stabbing and severe <break time=\"0.1s\" /> or a dull ache?";
    
    if(helpFlag)
    {
        speechOutput += " <break time=\"0.2s\" /> Your answer should be : <break time=\"0.2s\" /> pain type is stabbing <break time=\"0.1s\" /> or <break time=\"0.1s\" /> pain type is ache";
    }
    speechOutput += " </speak>";
    
    var repromptText = "What type of pain are you experiencing? Is it stabbing and severe  or a dull ache?";
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        "patientName"   : session.attributes.patientName ,
        "patientCase"   : session.attributes.patientCase
        };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handleStomachQ1(  context, intent, session, callback)
{
    var SPainType = "";
    
    console.log("handle Stomach Q1");
    
    //"What type of pain are you experiencing? Is it stabbing and severe? Is it a dull ache?"
    if( intent.slots && intent.slots.SPainType && intent.slots.SPainType.value )
    {
        SPainType = intent.slots.SPainType.value ;
    }
    else if( intent.slots && intent.slots.SPainType )
    {
        SPainType = intent.slots.SPainType ;
    }
    
    if( SPainType !== "" )
    {
        console.info("Type of pain = " + SPainType );
        
        session.attributes.patientCase += "Type of pain is " + SPainType + " . " ;
        
        //insertInquryDetailesTable(context, session.user.userId , "Type of pain is " + intent.slots.SPainType.value , CATEGORY_STOMACH, INQUIRY_NEW);
        prepareStomachQ2(false, session, callback);
    }
    else
    {
        prepareStomachQ1(true , session, callback);
    }    
}

function prepareStomachQ2(helpFlag , session, callback)
{
    console.log("Prepare Stomach Q2");
    
    //Does the pain also radiate into your shoulder, groin, or buttocks?   
    var sessionAttributes = {};
    var speechOutput ; 
    var shouldEndSession = false;
        
    speechOutput = "<speak> where the pain radiate the most: into your shoulder, groin, or buttocks?";
    
    if(helpFlag)
    {
        speechOutput += " <break time=\"0.2s\" /> Your answer should be like : <break time=\"0.2s\" /> it is radiate in shoulder.";
    }
    
    speechOutput += " </speak>";
    
    var repromptText = "where the pain radiate the most: into your shoulder, groin, or buttocks?";
    
    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        "patientName"   : session.attributes.patientName ,
        "patientCase"   : session.attributes.patientCase
        };
    
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handleStomachQ2(  context, intent, session, callback)
{
    var SRadiateType = "";
    console.log("Handle Stomach Q2");
    
    console.info("intent.slots.SRadiateType = " + intent.slots.SRadiateType );
    console.info("intent.slots.SRadiateType.value = " + intent.slots.SRadiateType.value );
    
    //Does the pain also radiate into your lower back, shoulder, groin, or buttocks?
    if( intent.slots && intent.slots.SRadiateType && intent.slots.SRadiateType.value )
    {
        SRadiateType = intent.slots.SRadiateType.value ; 
        
    } else if( intent.slots && intent.slots.SRadiateType  )
    {
        SRadiateType = intent.slots.SRadiateType ;
    }
    
    if( SRadiateType !== "")
    {
        console.info("Radiate Type = " + SRadiateType );
        session.attributes.patientCase += "Radiate is " +  SRadiateType + " . ";
        session.attributes.painCategory = CATEGORY_STOMACH ;
        
        
        //insertInquryDetailesTable( context, session.user.userId , "Radiate Type is " + intent.slots.SRadiateType.value , CATEGORY_STOMACH, INQUIRY_WAITING_FOR_ANSWER);
        //insertPatientInquiryInTable(context, session.user.userId , session);
        //handleFinishSessionRequest("<speak>Your case is recorded. remedy service feedback will be delivere in 24 hours</speak>.", session, callback);
        
        insertNewInquiryInTable(context , session , function(){
            console.log("inside Call back of insertNewInquiryInTable.");
            context.succeed(handleFinishSessionRequest("<speak>Your case is recorded. remedy service feedback will be delivere in 24 hours. bye. </speak>", session, callback));
        });    
        
    }
    else
    {
        prepareStomachQ2(true, session, callback);
    }
}

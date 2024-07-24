import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { AiOutlineSend } from "react-icons/ai";
import axios from 'axios'
import emailjs from 'emailjs-com';
import '../Styles/Chat.css';
import availableLanguages from './Languages';
import OpenAI from "openai";
//Setting OpenAI
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_API_KEY, // defaults to process.env["OPENAI_API_KEY"]
  dangerouslyAllowBrowser: true
});

function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [IsRequest, setIsRequest] = useState(false);
  const [isError, setisError] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US'); // Default language
  const [listening, setislistening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setrecognition] = useState('');
  const chatContainerRef = useRef(null);
  const synth = window.speechSynthesis;

  if (!synth) {
    setisError(true);
    console.log("Browser don't support Web Speech Api(Synthesis).");
  }
  else {
    console.log('Speaking: ',synth.speaking);
    console.log("Browser supports Web Speech Api(Synthesis).");
  }

  let recognition_;
  // Timeout duration to wait for silence before sending a request (in milliseconds)
  const silenceTimeoutDuration = 2000; // Adjust as needed
  const silenceTimerRef = useRef(null);

  useEffect(() => {

    // Update the input field with the recognized text when the transcript changes.
    setNewMessage(transcript);

    // Reset the silence timer when speech is detected
    if (transcript !== '') {
      clearTimeout(silenceTimerRef.current); // Clear the existing timer      
      silenceTimerRef.current = setTimeout(() => {
        handleSilenceTimeout();
      }, silenceTimeoutDuration);
    }

  }, [transcript]);

  useEffect(() => {
    // Scroll to the end of the chat container after sending a new message.
    // if (chatContainerRef.current) {
    //   chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    // }
    if (IsRequest) {
      console.log("Message to be processed: ", newMessage);
      ProcessInput(newMessage);
    }
  }, [messages])

  //Generating Request when user stops speaking
  const handleSilenceTimeout = () => {
    console.log("Transcript is Stopped so time to send request");
    console.log('Transcript: ', transcript);
    if (transcript !== '') {
      // If there's no speech for the specified duration
      // Create a new message object with a unique ID.
      const message = {
        id: Math.random(),
        text: transcript,
        isUser: true,
      };
      setIsRequest(true);
      setMessages([...messages, message]);
      handleVoiceInput('off');
    }
  };

  //Send Mail through EmailJS
  function SendEmail(_body) {
    console.log('Sending Email......');
    //Authentication of EmailJS Account
    const serviceId = process.env.REACT_APP_SERVICE_ID;
    const templateId = process.env.REACT_APP_TEMPLATE_ID;

    //Private Key of EmailJS account
    const userId = process.env.REACT_APP_USER_ID;

    //Owner or Admin mail
    const owner_email = process.env.REACT_APP_OWNER_EMAIL;

    const templateParams = {
      to_name: "Admin",
      message: _body,
      to_mail: owner_email,
    };
    emailjs.send(serviceId, templateId, templateParams, userId)
      .then((response) => {
        console.log('JSON Summary Sent to Admin.');
      }, (error) => {
        console.log('Failed to Send JSON Summary Admin.');
        console.error(error);
        return;
      });
  }

  //Handling Input
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
  };


  const handleVoiceInput = (str) => {
    if (str === 'off') {
      setislistening(false);
      if (!recognition) {
        console.log('Returned without turning off!');
        return;
      }
      // Stop speech recognition when 'off' is passed
      recognition.stop()
    } else {
      if (!listening) {

        // Check for SpeechRecognition or webkitSpeechRecognition
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
          console.log('Browser supports Web Speech API(Recognition).');
          recognition_ = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        }
        else {
          setisError(true);
          console.log('Browser donot support Web Speech API(Recognition).');
        }
        setrecognition(recognition_);
        console.log("Listening..........");
        setislistening(true);
        recognition_.continuous = true;
        recognition_.interimResults = true;
        recognition_.lang = selectedLanguage;
        recognition_.onresult = (event) => {
          const transcript_ = event.results[0][0].transcript;
          setTranscript(transcript_);
          setNewMessage(transcript_);
        };
        //Turning Speak On
        recognition_.start();
      }
      else {
        console.log('Turning Off....');
        setislistening(false);
        recognition.stop();
      }
    }
  };

  //Function to Speak Response
  function speakText(text) {
    console.log("AI is speaking.....");

    //Clearing old utterance
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Optional: Configure speech synthesis settings if needed
    utterance.lang = selectedLanguage;
    // utterance.volume = 1;
    // utterance.rate = 1;
    utterance.pitch = 1;

    // Attach an event listener for the 'speechend' event
    utterance.onend = () => {
      // Call the onComplete function when speech is completed
      handleVoiceInput();
    };
    console.log('Utterance: ',utterance);
    synth.speak(utterance);
  }


  const simulateResponse = (userMessage) => {
    setIsRequest(false);
    const responseMessage = {
      id: Math.random(),
      text: `${userMessage}`,
      isUser: false,
    };
    setMessages([...messages, responseMessage]);

    // Speak the response
    speakText(userMessage);
  };

  const ProcessInput = async (Input) => {

    setNewMessage('');
    const abstract = 'You will act as a Human Nurse Pro, a Professional nurse helping patients describe their SSI symptoms and provide them general information on their condition. You first greet the patient, ask them how they are feeling, and after they answered you regarding how they are feeling then proceed to ask them about their surgical site infection symptoms such as Drainage or Pus, The fever , the swilling and Redness , level of pain and other, then ask if they take any medications before You ask questions to clarify their surgical site infection symptoms and make them comfortable. You should not provide any diagnosis or medical advice but guide them to consult with a healthcare professional for accurate information. and After discussion let them know if there is any further assistant.';
    const transformedMessages = [
      { role: "system", content: abstract },
      ...messages.map((message) => ({
        role: message.isUser ? 'user' : 'assistant',
        content: message.text,
      })),
    ];

    //Without maintaining history
    /* const PromptMessage = [
      { role: "system", content: abstract },
      { role: "user", content: Input },
    ]; */
    console.log('Request: ', transformedMessages);
    const completion = await openai.chat.completions.create({
      messages: transformedMessages,
      model: "gpt-3.5-turbo",
    });
    const response = completion.choices[0].message.content;
    console.log('Response: ', response);
    simulateResponse(response);

    //resetTranscript();
    setTranscript('');
  }

  //Function to End Chat and make summary
  const EndChat = async () => {
    if (messages.length === 0) {
      handleVoiceInput('off');
      return;
    }
    const abstract = 'You will act as a Human Nurse Pro, a Professional nurse helping patients describe their SSI symptoms and provide them general information on their condition. You first greet the patient, ask them how they are feeling, and after they answered you regarding how they are feeling then proceed to ask them about their surgical site infection symptoms such as Drainage or Pus, The fever , the swilling and Redness , level of pain and other, then ask if they take any medications before You ask questions to clarify their surgical site infection symptoms and make them comfortable. You should not provide any diagnosis or medical advice but guide them to consult with a healthcare professional for accurate information. and After discussion let them know if there is any further assistant.';
    const command = 'Create a JSON summary of the medical consultation based on user response given in the previous chat. The fields should be 1) Symptoms 2) Pain level 3) Presence of swelling 4) Presence of pus from a wound 5) Need for further assistance.';
    handleVoiceInput('off');
    const Messages = [
      { role: "system", content: abstract },
      ...messages.map((message) => ({
        role: message.isUser ? 'user' : 'assistant',
        content: message.text,
      })),
      { role: "user", content: command },
    ];
    console.log('Complete Chat: ', Messages);
    const completion = await openai.chat.completions.create({
      messages: Messages,
      model: "gpt-3.5-turbo",
    });
    const JSON_summary = completion.choices[0].message.content;
    console.log('JSON Summary: ', JSON_summary);
    SendEmail(JSON_summary);
    setMessages([]);
  }

  const handleSend = (e) => {
    e.preventDefault();
    setisError(false);
    if (newMessage.trim() === '') return;

    // Create a new message object with a unique ID.
    const message = {
      id: Math.random(),
      text: newMessage,
      isUser: true,
    };
    handleVoiceInput('off');
    setIsRequest(true);
    setMessages([...messages, message]);
  };

  return (
    <div className='chat-app'>
      <div className='navbar'>
        <div className='app-name'>
          Care Wave
        </div>
      </div>
      <div className='chat-container'>
        <div className="chat-box">
          <div className="response-container" ref={chatContainerRef}>
            <div className='language-select'>
              <label htmlFor='languageSelect'>Select Language: </label>
              <select
                id='languageSelect'
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                {availableLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.isUser ? 'user' : 'gpt'}`}
                >
                  <div className="message-text">{message.text}</div>
                </div>
              ))}

            </div>
          </div>
          <div className='bottom-bar'>
            <div className="input-container">
              <input
                type="text"
                placeholder={listening ? 'Listening....' : 'Enter a prompt here'}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSend(e);
                  }
                }}
              />
              <div>
                <FontAwesomeIcon onClick={handleVoiceInput} icon={faMicrophone} className={`mic ${listening ? 'listening' : 'not-listening'}`} />
              </div>
              {/* <AiOutlineSend className="send-button" onClick={handleSend} /> */}
            </div>
            <div className='btn-div'>
              <button onClick={EndChat} className='btn'>End Chat</button>
            </div>
            {isError ? <p className='error'>Browser doesnot support speech recognition.</p> : <></>}
          </div>
        </div>
      </div>
      <div className='space'></div>
    </div>
  );
}

export default ChatApp;

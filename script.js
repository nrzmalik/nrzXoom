// Initialize player and chatHistory
const player = GetPlayer();
let chatHistory = player.GetVar("chatHistory");
let recognition;
let recognizing = false;

// Initialize SpeechRecognition
const initializeSpeechRecognition = () => {
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!window.SpeechRecognition) {
    alert("Your browser does not support the Web Speech API. Please try with a different browser.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.interimResults = true;

  recognition.addEventListener('start', () => recognizing = true);
  recognition.addEventListener('end', () => recognizing = false);
  recognition.addEventListener('result', handleSpeechResult);
  recognition.addEventListener('end', handleSpeechEnd);
};

const handleSpeechResult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript;
  player.SetVar("message", transcript);
  console.log(transcript);
};

const handleSpeechEnd = () => {
  console.log('Speech recognition has stopped.');
  player.SetVar("recognition", false);
  const message = player.GetVar("message");
  if (message) {
    player.SetVar("listen", false);
    player.SetVar("response", "");
    player.SetVar("shortMessage", shortenMessage(message));
    sendMessage();
  }
};

const toggleSpeechRecognition = () => {
  if (recognizing) {
    recognition.stop();
  } else {
    recognition.start();
  }
  recognizing = !recognizing;
};

// Shorten message to 125 characters if needed
const shortenMessage = (message) => message.length > 125 ? `${message.substring(0, 125)}...` : message;

// Speak the response
const speakResponse = () => {
  const response = player.GetVar('response');
  if (!response) {
    console.error('Response is not defined.');
    return;
  }

  const msg = new SpeechSynthesisUtterance(response);
  const voices = window.speechSynthesis.getVoices();
  msg.voice = voices[0];
  msg.volume = 1;
  msg.rate = 1;
  msg.pitch = 1;
  msg.onend = (e) => console.log(`Finished in ${e.elapsedTime} seconds.`);
  speechSynthesis.speak(msg);
};

// Send message to the API
const sendMessage = () => {
  const message = player.GetVar("message");
  const role = player.GetVar("role");
  let apiKey = player.GetVar("apiKey");

  if (!apiKey) {
    console.error("API Key is missing.");
    return;
  }

  apiKey = `Bearer ${apiKey}`;
  const requestMessage = `Act as a ${role}. Write your answer in maximum 170 characters. My question is: ${message}`;

  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://api.openai.com/v1/chat/completions', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', apiKey);

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        handleApiResponse(JSON.parse(xhr.responseText), message);
      } else {
        console.error("Error in API request:", xhr.status, xhr.statusText, xhr.responseText);
      }
    }
  };

  const data = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: requestMessage }
    ]
  });

  xhr.send(data);
};

const handleApiResponse = (apiResponse, question) => {
  const generatedResponse = apiResponse.choices?.[0]?.message?.content?.trim();

  if (generatedResponse) {
    player.SetVar("response", generatedResponse);
    speakResponse();
    player.SetVar("listen", true);
    player.SetVar("speak", false);
    chatHistory += `\nQuestion: ${question}\nAnswer: ${generatedResponse}\n`;
    player.SetVar("chatHistory", chatHistory);
    player.SetVar("message", "");
  } else {
    console.error("Unexpected API response:", JSON.stringify(apiResponse));
  }
};

// Copy response to clipboard
const copyResponse = () => {
  const response = player.GetVar("response");
  if (response) {
    navigator.clipboard.writeText(response)
      .then(() => console.log('Text copied to clipboard'))
      .catch((error) => console.error('Failed to copy text:', error));
  }
};

// Export chat history as a .doc file
const exportChat = () => {
  const chatHistory = player.GetVar("chatHistory");
  if (chatHistory) {
    const blob = new Blob([chatHistory], { type: 'application/msword' });
    const downloadLink = document.createElement("a");
    downloadLink.download = "Chat History.doc";
    downloadLink.href = window.URL.createObjectURL(blob);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }
};

// Initialize the SpeechRecognition on page load
initializeSpeechRecognition();

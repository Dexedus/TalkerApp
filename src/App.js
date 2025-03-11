import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, limit, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { useAuthState } from 'react-firebase-hooks/auth'; 
import { useCollectionData } from 'react-firebase-hooks/firestore'; 

// This is configuration info from my firebase project
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};


//Gets results from app and stores them as consts
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const analytics = getAnalytics(app);


//Main App component that is rendered. Ternary operator checks for authentication of user, then renders either the chatroom or sign in components.
function App() {
  const [user] = useAuthState(auth);
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="App">
      <header>
        <h1 className='title'>Talker💬</h1>
        {selectedUser ? <GoBack onGoBack={() => setSelectedUser(null)} /> : <SignOut />}
      </header>

      <section>
      {selectedUser ? <Profile user={selectedUser} /> : (user ? <ChatRoom onSelectUser={setSelectedUser} /> : <SignIn />)}
      </section>
    </div>
  );
}


// User clicks the button to sign in, this triggers the sign in with Google pop up. I enabled this provider in Firebase.
function SignIn() {
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    logEvent(analytics, 'sign_in', { method: 'Google' });
  };

  return (
    <div>
      <button className="sign-in" onClick={signInWithGoogle}>Sign in with Google</button>
      <div className="SignInForm">
        <p>Developed and designed by Karl Fleming</p>
      </div>
    </div>  
  );
}


//Sign out component. Returns the current user, and signs that user out when button is clicked.
function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => signOut(auth)}>Sign Out</button>
  );
}

function GoBack({ onGoBack }) {
  return <button className="sign-out" onClick={onGoBack}>Go Back</button>;
}



//Dummy creates a ref to scroll to the latest message. Then, we get the message collection from firebase with messagesRef. The query, q, orders them and limits them to 25.
function ChatRoom({ onSelectUser }) {
  const dummy = useRef();
  const messagesRef = collection(firestore, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(25));


  //Set up useState hooks.
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');


  //useEffect creates a listener called onSnapshot and updates the state of messages whenever there is a change in the Firestore.
  useEffect(() => {
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, []);


  //sendMessage triggered when form is submitted. 
  const sendMessage = async (e) => {
    //Stops the page refreshing.
    e.preventDefault();


    //Gets the uid and photoURL from the current user.
    const { uid, photoURL } = auth.currentUser;


    //adds a doc to the messageReg, which is the messages collection, with the following values.
    await addDoc(messagesRef, {
      text: formValue,
      createdAt: serverTimestamp(),
      uid,
      photoURL
    });


    //We must set the form value state to an empty string. Now when users type into the form, the text updates as they type, as the form value is = to the formValue state.
    setFormValue('');
    dummy.current.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    //In main, we display the messages from the useState hook. we ALSO map each message, for each one rendering the ChatMessage component and sending a prompt called message. 
    <>
      <main>
        {messages && messages.slice().reverse().map(msg => <ChatMessage key={msg.id} message={msg} onSelectUser={onSelectUser} />)}
        <span ref={dummy}></span>
      </main>

      <form onSubmit={sendMessage}>
        <input
          value={formValue}
          //Updates the formValue in real time.
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="Say something nice"
        />
        <button type="submit" disabled={!formValue}>🕊️</button>
      </form>
    </>
  );
}


//The ChatMessage component contains the message prompt which itself contains the message data. We only need the text, uid and photoURL here. 
function ChatMessage({ message, onSelectUser }) {
  const { text, uid, photoURL } = message;


  //Messages from the user will look different to messages from other users. We achieve this by modifying the className for the messages div to either sent or recieved
  //To determine if it a sent or recieved message, we check to see if the uid is === to the auth.currentUser.uid 
  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return (
    <div className={`message ${messageClass}`}>
      <img className='homeImg' src={photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} alt="user avatar" onClick={() => onSelectUser({ uid, photoURL })}/>
      <p>{text}</p>
    </div>
  );
}

function Profile({user}) {
  return(
    <div className='profileContainer'>
      <img className='profileImg' src={user.photoURL} />
      <h1>Welcome to my profile</h1>
      <p>Hi, this is my profile. *You will soon be able to update your profile descriptions.*</p>
    </div>
  )
}

export default App;

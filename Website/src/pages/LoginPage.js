import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import BookingOverview from '../components/BookingOverview';
import { Navigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { currentUser } = useAuth(); // Lese den aktuellen User-Status

  const handleSignUp = async (e) => {
    e.preventDefault();
    alert("Registrierung ist deaktiviert. Benutzer können nur vom Administrator erstellt werden.");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login erfolgreich für:', cred.user.email, 'UID:', cred.user.uid);
      
      const udoc = await getDoc(doc(db, 'users', cred.user.uid));
      console.log('Benutzer-Dokument existiert:', udoc.exists());
      
      if (!udoc.exists()) {
        console.error('Benutzer-Dokument nicht gefunden für UID:', cred.user.uid);
        alert('Benutzer-Dokument nicht gefunden. Bitte wenden Sie sich an den Administrator.');
        await signOut(auth);
        return;
      }
      
      console.log('Benutzer-Dokument gefunden:', udoc.data());
      await setDoc(doc(db, 'users', cred.user.uid), {
        lastLogin: serverTimestamp(),
      }, { merge: true });
      console.log('LastLogin aktualisiert');
      
    } catch (error) {
      console.error('Login-Fehler:', error);
      alert("Fehler beim Login: " + error.message);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (currentUser) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(135deg, rgba(0,169,157,0.1) 0%, rgba(0,0,0,0.8) 100%)'
    }}>
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '400px',
        color: '#000000'
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '30px',
          color: '#00A99D',
          fontFamily: 'comfortaa',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}>
          Anmeldung
        </h1>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#333',
              fontFamily: 'comfortaa'
            }}>
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="E-Mail eingeben"
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'comfortaa',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00A99D'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>
          
          <div style={{ marginBottom: '25px' }}>
            <label style={{ 
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#333',
              fontFamily: 'comfortaa'
            }}>
              Passwort:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Passwort eingeben"
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'comfortaa',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00A99D'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>
          
          <button 
            type="submit" 
            style={{ 
              width: '100%', 
              padding: '14px', 
              backgroundColor: '#00A99D', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              fontFamily: 'comfortaa',
              transition: 'background-color 0.3s ease',
              boxShadow: '0 4px 12px rgba(0,169,157,0.3)'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#008A7B'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#00A99D'}
          >
            Anmelden
          </button>
        </form>
        
        <div style={{ 
          textAlign: 'center', 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <p style={{ 
            margin: 0, 
            color: '#666',
            fontSize: '14px',
            fontFamily: 'comfortaa'
          }}>
            Bunteliga Freiburg<br />
            <small>Vereinsmanagement System</small>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
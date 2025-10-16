import { useState, useRef, useEffect } from 'react';
import './index.css';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [callStatus, setCallStatus] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [hasIncomingCall, setHasIncomingCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const stringeeClientRef = useRef(null);

  if (!stringeeClientRef.current) {
    stringeeClientRef.current = new window.StringeeClient();
  }
  const stringeeClient = stringeeClientRef.current;
  let call = null;

  useEffect(() => {
    stringeeClient.on('connect', () => console.log('Connected to StringeeServer'));

    stringeeClient.on('authen', (res) => {
      if (res.message === 'SUCCESS') {
        setLoggedIn(true);
      }
    });

    stringeeClient.on('otherdeviceauthen', (res) => {
      console.log('Other device authen:', res);
      // Handle other device login if needed
    });

    stringeeClient.on('disconnect', () => {
      console.log('Disconnected from StringeeServer');
      setLoggedIn(false);
    });

    stringeeClient.on('incomingcall', (incomingcall) => {
      console.log('incomingcall', incomingcall);
      call = incomingcall;
      settingCallEvent(incomingcall);
      setHasIncomingCall(true);
      setIsVideoCall(incomingcall.isVideoCall);
      setFriendUsername(incomingcall.fromNumber);
      setLoading(true);
    });

    return () => {
      // cleanup
    };
  }, []);

  const settingCallEvent = (call1) => {
    call1.on('addremotestream', function (stream) {
      console.log('addremotestream');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
        remoteVideoRef.current.srcObject = stream;
      }
    });

    call1.on('addlocalstream', function (stream) {
      console.log('addlocalstream');
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.srcObject = stream;
      }
    });

    call1.on('signalingstate', function (state) {
      console.log('signalingstate ', state);
      setCallStatus(state.reason);

      if (state.code === 3) {
        setIsCalling(true);
        setLoading(false);
      } else if (state.code === 4 || state.code === 5 || state.code === 6) {
        setIsCalling(false);
        setLoading(false);
        setHasIncomingCall(false);
      }
    });

    call1.on('mediastate', function (state) {
      console.log('mediastate ', state);
    });

    call1.on('info', function (info) {
      console.log('on info:' + JSON.stringify(info));
    });
  };

  const onLogin = async (e) => {
    e.preventDefault();
    if (loginLoading) return;
    setLoginLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_JWT_ENDPOINT}?u=${username}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setAccessToken(data.access_token);
      stringeeClient.connect(data.access_token);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Đăng nhập thất bại: ' + error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const onCall = async (videoCall = false) => {
    if (isCalling || !friendUsername) return;
    if (username === friendUsername) {
      alert('Không thể gọi cho chính mình');
      return;
    }

    setLoading(true);
    setIsVideoCall(videoCall);

    call = new window.StringeeCall2(stringeeClient, username, friendUsername, videoCall);
    settingCallEvent(call);

    call.makeCall(function (res) {
      console.log('make call callback: ' + JSON.stringify(res));
      setFriendUsername(res.toNumber);
    });
  };

  const acceptCall = () => {
    call.answer(function (res) {
      console.log('answer call callback: ' + JSON.stringify(res));
      setHasIncomingCall(false);
      setIsCalling(true);
      setLoading(false);
    });
  };

  const rejectCall = () => {
    call.reject(function (res) {
      console.log('reject call callback: ' + JSON.stringify(res));
      setHasIncomingCall(false);
      setLoading(false);
    });
  };

  const hangupCall = () => {
    call.hangup(function (res) {
      console.log('hangup call callback: ' + JSON.stringify(res));
      setIsCalling(false);
      setLoading(false);
    });
  };

  const upgradeToVideoCall = () => {
    call.upgradeToVideoCall();
    setIsVideoCall(true);
  };

  return (
    <div className="row">
      <div className="col">
        <h1>Demo: Voice Call & Video Call</h1>

        <p>
          Trạng thái: {loggedIn ? `đã đăng nhập (${username})` : 'chưa đăng nhập'}
        </p>

        {!loggedIn ? (
          <form onSubmit={onLogin}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-control"
                id="username"
                placeholder="Nhập tên đăng nhập"
                autoFocus
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loginLoading}>
              {loginLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); onCall(false); }}>
            <div className="mb-3">
              <label htmlFor="friend-username" className="form-label">Bạn muốn gọi cho ai?</label>
              <input
                type="text"
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                className="form-control"
                id="friend-username"
                placeholder="Nhập ID bạn bè"
                disabled={isCalling || loading}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || isCalling}
            >
              <i className="bi bi-telephone"></i>
              {loading ? 'Đang gọi...' : 'Gọi thoại'}
            </button>

            <button
              type="button"
              className="btn btn-secondary ms-3"
              disabled={loading || isCalling}
              onClick={() => onCall(true)}
            >
              <i className="bi bi-camera-video"></i>
              {loading ? 'Đang gọi...' : 'Gọi video'}
            </button>
          </form>
        )}

        {hasIncomingCall && (
          <div className="mt-3">
            <p>
              Bạn nhận được cuộc gọi từ: <strong>{call.fromNumber}</strong>
            </p>
            <button className="btn btn-primary me-3" onClick={acceptCall}>
              Trả lời
            </button>
            <button className="btn btn-danger" onClick={rejectCall}>Từ chối</button>
          </div>
        )}

        {isCalling && (
          <div className="mt-3">
            <p>
              Đang gọi cho: <strong>{friendUsername}</strong>
            </p>
            <button className="btn btn-danger" onClick={hangupCall}>Kết thúc</button>
          </div>
        )}

        {isCalling && isVideoCall && (
          <div className="mt-3">
            <video ref={localVideoRef} autoPlay muted style={{ width: '300px' }}></video>
            <video ref={remoteVideoRef} autoPlay style={{ width: '300px', marginLeft: '1rem' }}></video>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
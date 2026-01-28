import React, { useState } from 'react';

export const LockScreen = ({ onUnlock }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password.trim()) {
            onUnlock(password);
        } else {
            setError('Please enter a password');
        }
    };

    return (
        <div className="lock-screen">
            <div className="lock-card">
                <div className="lock-icon">🔒</div>
                <h2>Access Required</h2>
                <p>Please enter the access password to use PA Trainer.</p>
                
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Enter Password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                        className="lock-input"
                        autoFocus
                    />
                    {error && <div className="lock-error">{error}</div>}
                    <button type="submit" className="lock-btn">
                        Enter
                    </button>
                </form>
            </div>
            <style>{`
                .lock-screen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: #f8f9fa;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                .lock-card {
                    background: white;
                    padding: 2rem;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                    width: 100%;
                    max-width: 360px;
                    text-align: center;
                }
                .lock-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                .lock-card h2 {
                    margin: 0 0 0.5rem 0;
                    color: #1a1a1a;
                }
                .lock-card p {
                    margin: 0 0 1.5rem 0;
                    color: #666;
                    font-size: 0.9rem;
                }
                .lock-input {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    font-size: 1rem;
                    margin-bottom: 1rem;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .lock-input:focus {
                    border-color: #2962FF;
                }
                .lock-btn {
                    width: 100%;
                    padding: 12px;
                    background: #2962FF;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .lock-btn:hover {
                    background: #1976D2;
                }
                .lock-error {
                    color: #F23645;
                    font-size: 0.85rem;
                    margin-bottom: 1rem;
                    text-align: left;
                }
            `}</style>
        </div>
    );
};

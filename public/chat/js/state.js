// Shared constants
export const ALLOWED_LANGUAGES = ['php', 'javascript', 'python', 'html', 'css', 'plaintext'];
export const UNSAFE_KEYS = ['__proto__', 'constructor', 'prototype'];

export const TEAM_COLORS = [
    { id: 'red',    label: 'Red',    bg: '#ffcdd2', accent: '#e57373' },
    { id: 'pink',   label: 'Pink',   bg: '#f8bbd0', accent: '#f06292' },
    { id: 'purple', label: 'Purple', bg: '#e1bee7', accent: '#ab47bc' },
    { id: 'violet', label: 'Violet', bg: '#d1c4e9', accent: '#7e57c2' },
    { id: 'indigo', label: 'Indigo', bg: '#c5cae9', accent: '#5c6bc0' },
    { id: 'blue',   label: 'Blue',   bg: '#bbdefb', accent: '#42a5f5' },
    { id: 'sky',    label: 'Sky',    bg: '#b3e5fc', accent: '#29b6f6' },
    { id: 'cyan',   label: 'Cyan',   bg: '#b2ebf2', accent: '#26c6da' },
    { id: 'teal',   label: 'Teal',   bg: '#b2dfdb', accent: '#26a69a' },
    { id: 'green',  label: 'Green',  bg: '#c8e6c9', accent: '#66bb6a' },
    { id: 'lime',   label: 'Lime',   bg: '#f0f4c3', accent: '#c6ca53' },
    { id: 'yellow', label: 'Yellow', bg: '#fff9c4', accent: '#ffee58' },
    { id: 'amber',  label: 'Amber',  bg: '#ffecb3', accent: '#ffca28' },
    { id: 'orange', label: 'Orange', bg: '#ffe0b2', accent: '#ffa726' },
    { id: 'brown',  label: 'Brown',  bg: '#d7ccc8', accent: '#a1887f' },
    { id: 'slate',  label: 'Slate',  bg: '#cfd8dc', accent: '#78909c' },
];

// Mutable application state — mutate properties directly, never replace the object.
export const state = {
    role: null,              // 'controller' | 'participant'
    peer: null,
    controllerConn: null,    // participant's connection to controller
    peers: {},               // controller: peerId → DataConnection
    participantNames: {},    // controller: peerId → display name
    nameRegistry: {},        // lowercase name → { token, displayName, retired }
    tokenRegistry: {},       // token → { displayName, peerId, previousNames }
    messages: [],            // controller: in-memory history
    sessionName: '',
    joinedSessionName: '',   // session name entered by participant on join form
    displayName: '',
    currentPin: '',
    sessionEnded: false,
    isControllerSession: false,
    snippetTarget: null,     // 'controller' | 'participant'
    nameColors: {},          // name.toLowerCase() → colorId
    useRelay: false,         // whether to use TURN relay servers
    turnUrl:  '',            // TURN server URL
    turnUser: '',            // TURN username
    turnCred: '',            // TURN credential
};

// Singleton Socket.IO instance — set by server.js, used by services
let _io = null;
module.exports = {
  setIO: (io) => { _io = io; },
  getIO: () => _io,
};

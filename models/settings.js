const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  siteTitle: { type: String, default: 'Kenma Portfolio' },
  primaryColor: { type: String, default: '#ffd900' },
  fontFamily: { type: String, default: 'Varela Round, sans-serif' },
  profileImage: { type: String, default: '' },
  skills: { type: [{ name: String, value: Number }], default: [

  ] },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', SettingsSchema);

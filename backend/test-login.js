require('dotenv').config();
const { User } = require('./src/models');
const { sequelize } = require('./src/config/sequelize');

async function test() {
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { email: 'admin@example.com' } });
    if (!admin) {
      console.log('Admin not found!');
      return;
    }
    console.log('Admin hashed password:', admin.password);
    const isValid = await admin.comparePassword('Admin123!');
    console.log('Is valid?', isValid);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();

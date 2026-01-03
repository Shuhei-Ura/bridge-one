export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  sessionSecret: process.env.SESSION_SECRET || 'fsd8Fj29_!kd93jx!29s@LQm39snvQ',
  nodeEnv: process.env.NODE_ENV || 'development',
});
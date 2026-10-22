export async function register() {
 if(process.env.NEXT_RUNTIME==='nodejs') {
  const {loadAuth,registerService}=await import('../../../packages/admin-auth/src/index');
  loadAuth();
  const registration=registerService();
  if(registration.state.dev)console.log('DOROB DEV MODE: admin authentication is disabled.');
 }
}

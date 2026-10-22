import {rotateAuth} from './index';
try {const state=rotateAuth();console.log('New Dorob admin token: '+state.token);}catch(error){console.error(error instanceof Error?error.message:'Token rotation failed.');process.exitCode=1;}

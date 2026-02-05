
import {Backend,Signals} from './scripts/backend.js';

export default {
	fetch(request,env,context) {
		try {
			return Backend.fetch(request,env,context);
		} catch (error) {
			console.log(error);
			Signals.setMessage('reject','default','error',error.message);
			return Signals.response(500,'Server error');
		}
	}
};

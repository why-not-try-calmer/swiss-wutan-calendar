const t0 = performance.now()

// GOOGLE FIREBASE CLIENT CREDENTIALS
const firebaseConfig = {
	apiKey: "AIzaSyBn9ur32UG9DkmN74HYciXzcp7uoJ2hwuU",
	authDomain: "main-repo.firebaseapp.com",
	databaseURL: "https://main-repo.firebaseio.com",
	projectId: "main-repo",
	storageBucket: "main-repo.appspot.com",
	messagingSenderId: "682912307930",
	appId: "1:682912307930:web:065128b1ab322a66"
};
firebase.initializeApp(firebaseConfig);

// FIRESTORE
const db = firebase.firestore()

// GOOGLE FIREBASE MESSAGING
const messaging = firebase.messaging()

window.onload = function () {
	new Vue({
		el: '#app',
		vuetify: new Vuetify(),
		data() {
			return {
				// operational stuff
				api: undefined,
				authorized: false,
				navItems: [{ title: 'Introduction', target: '#intro' }, { title: 'Authentication', target: '#auth' }, { title: 'Manage events', target: '#manage' }, { title: 'Google Calendar', target: '#gCal' }, { title: 'Submit new events', target: '#submit' }, { title: 'Subscribe to new events', target: '#subscribe' }],
				nav: true,
				submittedEvents: [],
				pulledEvents: [],
				search: '',
				submittedEvents_headers: [
					{ text: 'Title', value: 'summary', sortable: 'true' },
					{ text: 'Submitted By', value: 'submitted_by', sortable: 'true' },
					{ text: 'Topics', value: 'topics', sortable: 'true' },
					{ text: 'Start', value: 'start.dateTime', sortable: 'true' },
					{ text: 'End', value: 'end.dateTime' },
					{ text: 'Location', value: 'location', sortable: 'true' }
				],
				events_headers: [
					{ text: 'Title', value: 'summary', sortable: 'true' },
					{ text: 'Start', value: 'start.dateTime', sortable: 'true' },
					{ text: 'End', value: 'end.dateTime' },
					{ text: 'Location', value: 'location', sortable: 'true' }
				],
				selectedEvents: [],
				active_tab: 1,
				rejecting: false,
				rejecting_why: '',
				iframe_key: 0,
				valid: true,
				firstNameRules: [
					v => !!v || 'Name is required',
					v => (v && v.length <= 25) || 'Name must be less than 10 characters',
				],
				lastNameRules: [
					v => !!v || 'Name is required',
					v => (v && v.length <= 25) || 'Name must be less than 10 characters',
				],
				emailRules: [
					v => !!v || 'E-mail is required',
					v => /.+@.+\..+/.test(v) || 'E-mail must be valid',
				],
				phoneRules: [
					v => !!v || 'Phone number is required',
					v => /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im.test(v.trim()) || 'Phone number must be valid',
				],
				schools_opts: ['Goju Kan Bern', 'Wutan Thun', 'Zenshin Basel', 'Kungfu21', 'Taekwondo Schule Basel', 'Training Center Fribourg'],
				// author
				dates: [],
				refDate: new Date().toISOString().substr(0, 10),
				pickerDate: null,
				author: {
					firstName: '',
					lastName: '',
					email: '',
					phone: '',
					is_school: null,
					school: ''
				},
				// event
				event: {
					title: '',
					location: '',
					start: '',
					end: '',
					time: "09:00",
					arts: ['Bagua', 'Baji', 'Tai chi'],
					levels: ['Beginners', 'Advanced'],
					privacy: null,
					discount: null,
					registration: null,
					registration_details: '',
					comment: '',
					topics: ['Wutan Official', 'CH Seminars', 'TW Seminars'],
				},
				user: {
					topics: ['Wutan Official'],
					notifs_prefs: ['Email', 'Web push'],
					reminders: ['added','1 week before'],
					emailNotif: '',
					gUserEmail: '',
					name: '',
					token: '',
				},
				arts_opts: ['Bagua', 'Baji', 'Tai chi', 'Kung Fu', 'Mizongyi', 'Xing Yi'],
				levels_opts: ['Beginners', 'Advanced'],
				fillFrom_opts: ['fill from email', 'fill from phone', 'fill from school'],
				topics_opts: ['Wutan Official', 'CH Seminars', 'TW Seminars'],
				reminders_opts:['added','updated or cancelled', '1 week before','2 days before'],
				locked: false,
				notifs_opts: ['Email', 'Web push'],
				notif_snackbar: false,
				push_snackbar: false,
				newNotif: '',
				newWebPush:''
			}
		},

		created() {
			this.api = gapi
			this.loadGapiClient()
			this.initMessaging()
			this.checkSignedIn()
		},

		mounted() {
			console.log('Loaded in (sec)', performance.now() - t0)
		},

		computed: {
			events() {
				return this.pulledEvents.length > 0 ? this.pulledEvents : []
			},
			thisMonthEvents() {
				return this.events.filter(e => this.refDate.substr(0, 7) == e.start.dateTime.substr(0, 7))
			},
			locker() {
				return this.locked ? 'Unlock email address' : 'Lock email address'
			}
		},

		methods: {

			initMessaging() {
				messaging.usePublicVapidKey("BJV_rKOrznrxId6JaxqYzlt7HcHjCK-c5S4062SL-dCqDtDkFs5fxifKdAtSyy3OIovPzhRC_O33reZbzBa1O6E");
				messaging.onTokenRefresh(() => {
					messaging.getToken().then((refreshedToken) => {
						console.log('Token refreshed.');
						this.user.token = refreshedToken
						db.collection('swiss-wutan-subscribed').doc(this.user.gUserEmail).update({ 'push_token': refreshedToken })
					}).catch((err) => {
						console.log('Unable to retrieve refreshed token ', err);
						showToken('Unable to retrieve refreshed token ', err);
					});
				});

				messaging.onMessage((payload) => {
					this.newWebPush = 'NEW NOTIFICATION. ' + payload['notification']['title'] + '\n' + payload['notification']['body']
				});

			},

			checkSignedIn() {
				firebase.auth().onAuthStateChanged((firebaseUser) => {
					if (firebaseUser) {
						this.user.gUserEmail = firebaseUser.email
						this.user.name = firebaseUser.displayName
						this.newNotif = 'Hi again, ' + this.user.name
						this.updateUI(true)
					} else {
						this.updateUI(false)
					}
				});
			},

			signIn() {
				const provider = new firebase.auth.GoogleAuthProvider();
				provider.addScope('https://www.googleapis.com/auth/calendar');
				firebase.auth().signInWithPopup(provider).then(function (result) {
					// This gives you a Google Access Token. You can use it to access the Google API.
					this.updateUI(true)
					//let token = result.credential.accessToken
				}).catch(function (error) {
					console.error(error)	
				});

			},

			signOut() {
				firebase.auth().signOut().then(() => {
					console.log('User signed out')
					this.updateUI(false)
				})
			},

			updateUI(is_authorized) {
				if (is_authorized) {
					this.pullSubmittedEvents().then(events => {
						this.submittedEvents = events
						this.authorized = true;
						this.active_tab = 0
						let userRef = db.collection('swiss-wutan-subscribed').doc(this.user.gUserEmail)
						userRef.get()
							.then(doc => {
								if (!doc.exists) userRef.set({ 'email': this.user.gUserEmail, 'created_on': firebase.firestore.FieldValue.serverTimestamp() })
								else {
									this.user.notifs_prefs = doc.data().notifs_prefs || []
									this.user.token = doc.data().token || ''
									this.user.emailNotif = this.user.gUserEmail
									this.user.topics = doc.data().topics || []
									this.user.reminders = doc.data().reminders || []
									this.locked = true
								}
							})
					})
				} else {
					this.submittedEvents = []
					this.authorized = false;
					this.active_tab = 1
				}
				this.authorized = is_authorized
			},

			loadGapiClient() {
				this.api.load('client:auth2', this.initClient)
			},

			initClient() {
				let vm = this
				vm.api.client.init(
					{
						apiKey: 'AIzaSyBzpFzhzVLPaQBH3r0WVv9Jg9dDJnM15Hw',
						clientId: '269173845983-bh57obunpvb47omgcbm6fq7nk3ube1mu.apps.googleusercontent.com',
						discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
						scope: 'https://www.googleapis.com/auth/calendar',
						calendar: '3mo0a639qfhs9tjc1idmu4kkus@group.calendar.google.com'
					}
				).then(_ => this.pullScheduled()).then(res => this.pulledEvents = res)
			},

			pullScheduled() {
				let vm = this
				return vm.api.client.calendar.events.list({
					'calendarId': '3mo0a639qfhs9tjc1idmu4kkus@group.calendar.google.com',
					'timeMin': (new Date()).toISOString(),
					'showDeleted': false,
					'singleEvents': true,
					'maxResults': 10,
					'orderBy': 'startTime'
				}).then(response => {
					return response.result.items.map(e => {
						return {
							'local_id': Math.floor(Math.random() * Math.floor(1000)).toString(),
							'validation_status': 'accepted',
							'summary': e.summary,
							'description': e.description,
							'location': e.location,
							'start': { 'dateTime': e.start.dateTime },
							'end': { 'dateTime:': e.end.dateTime }
						}
					})
				})
			},

			// Pull submitted events from firestore
			pullSubmittedEvents() {
				return db.collection('swiss-wutan-events').where("validation_status", "==", "submitted").get()
					.then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
					.catch(err => console.log(JSON.stringify(err)))
			},

			// Accept or reject events
			acceptSubmitted() {
				const vm = this
				const gCalFields = ['status', 'updated', 'htmlLink', 'summary', 'description', 'location', 'start', 'end', 'organizer', 'creator', 'source', 'reminders']
				const sanitize = (event) => {
					for (let k in event) {
						if (!gCalFields.includes(k)) delete event[k]
					}
					return event
				}
				const events = this.selectedEvents.filter(e => e['validation_status'] === 'submitted')
				let nb_events = events.length

				Promise.all(events.map(e => db.collection('swiss-wutan-events').doc(e.id).update({ 'validation_status': 'accepted' })))
					.then(() => {
						events.forEach(e => {
							let r = vm.api.client.calendar.events.insert({
								'calendarId': '3mo0a639qfhs9tjc1idmu4kkus@group.calendar.google.com',
								'resource': sanitize(e)
							})
							r.execute(() => {
								this.updateUI(this.authorized)
							})
						})
					})
					.then(() => this.newNotif = nb_events.toString() + ' event(s) accepted!')
					.catch(err => {
						console.error('This went wrong', err)
						this.newNotif = 'Something went wrong. Please get in touch.'
					})

			},


			sendRejection() {
				console.log('rejected')
			},

			// Little hack for iframe component refresh
			refreshFrame() {
				this.iframe_key += 1;
			},

			// FIX ME : TALK TO DATABASE
			submitEvent() {
				if (this.$refs.form.validate()) {
					db.collection('swiss-wutan-events').add({
						'summary': this.eventTitle,
						'location': this.eventLocation,
						'description': this.comments,
						'start': {
							'dateTime': this.eventStart,
							'timeZone': 'Europe/Zurich'
						},
						'end': {
							'dateTime': this.eventEnd,
							'timeZone': 'Europe/Zurich'
						},
						'topics': this.topics,
						'submitted_by': this.user.gUserEmail,
						'validation_status': 'submitted'
					})
					this.newNotif = 'Event submitted!'
				} else {
					this.newNotif = 'Please correct the form first.'
				}
			},

			reset() {
				this.$refs.form.reset()
			},

			resetValidation() {
				this.$refs.form.resetValidation()
			},

			lockUnlock() {
				this.locked ? this.locked = false : this.locked = true
			},

			subUnsub(verdict) {
				let email = verdict ? this.user.emailNotif : this.user.gUserEmail
				db.collection('swiss-wutan-subscribed').doc(this.user.gUserEmail).update({
					'notifs_prefs': this.user.notifs_prefs,
					'email': email,
					'topics': this.user.topics,
					'reminders': this.user.reminders
				}).catch(err => this.newNotif = 'An error occurred ' + err)
				this.newNotif = 'Subscription edited!'
			},

			testEmail() {
				alert('To test this feature, make sure you have registered to Wutan Official and are accepting notifications via emails. Then select the submitted event above, and click the ACCEPT SUBMITTED EVENT button.')
			},

			testPush() {
				Notification.requestPermission().then((permission) => {
					if (permission === 'granted') {
						// subsequent calls to getToken will return from cache.
						messaging.getToken().then((currentToken) => {
							if (currentToken) {
								db.collection('swiss-wutan-subscribed').doc(this.user.gUserEmail).update({ 'push_token': currentToken })
								setTimeout(() => { this.sendPush(currentToken); }, 2000)
								alert('A notification will be issued after you close this window. Switch now to another tab or window to see the background notification. Or stay here to see the foreground notification.')
							} else {
								console.log('No Instance ID token available. Request permission to generate one.');
								console.log('Got this token', currentToken)
							}
						}).catch((err) => {
							console.log('An error occurred while retrieving token. ', err);
							console.error('Error retrieving Instance ID token. ', err);
						});

					} else {
						console.log('Unable to get permission to notify.');
					}
				})
			},

			sendPush(token) {
				let key = 'AAAAnwC-2to:APA91bG4Ehb9g8Gt7vjMyqO5-S5EL8XD0ZpJaEWXpHF6wm2AusPieTcSjfvO_ya6izP7cU5L0CWV1xs3eeS-rhg0TERFowF_0QZtyYLSzMfvdyM6NRQG9ncR-oUXHg_IpO1YuNttWtYN';
				let notification = {
					'title': 'You have the KUNG-FU!',
					'body': 'Yet, your journey is only beginning',
					'click_action': 'https://swiss-wutan-calendar-beta.netlify.com/'
				};

				fetch('https://fcm.googleapis.com/fcm/send', {
					'method': 'POST',
					'headers': {
						'Authorization': 'key=' + key,
						'Content-Type': 'application/json'
					},
					'body': JSON.stringify({
						'notification': notification,
						'to': token
					})
				}).then(function (response) {
					console.log(response);
				}).catch(function (error) {
					console.error(error);
				})
			},


		},
		watch: {
			pickerDate(val) {
				this.refDate = val
			},
			newNotif(val){
				this.notif_snackbar = true
			},
			newWebPush(val){
				this.push_snackbar = true
			},
		}
	});
}
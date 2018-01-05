import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Switch,
  DeviceEventEmitter
} from 'react-native';

var { FBLogin } = require('react-native-facebook-login');

import Pusher from 'pusher-js/react-native';

import Profile from './profile';
import Friends from './friends';

import { regionFrom } from '../helpers';

export default class Index extends Component<{}> {

	static navigationOptions = {
		title: 'LocSharer',
	};


  constructor() {

    super();

  	this.watchId = null;
  	this.pusher = null;
  	this.user_channel = null;
  	this.onLogin = this.onLogin.bind(this);
  	this.onLoginFound = this.onLoginFound.bind(this);
  	this.onLogout = this.onLogout.bind(this);
  	this.setUser = this.setUser.bind(this);
  	this.setFriends = this.setFriends.bind(this);
  	this.toggleLocationSharing = this.toggleLocationSharing.bind(this);
  	this.onViewLocation = this.onViewLocation.bind(this);

  	this.state = {
  		is_loggedin: false,
  		is_location_shared: false,
		  user: null,
  		friends: null,
  		subscribed_to: null,
  		subscribed_friends_count: 0
  	};

  }


  setUser(login_data) {

  	let user_id = login_data.profile.id;
    this.setState({
  	  is_loggedin: true,
  		user: {
  			id: user_id,
  			access_token: login_data.credentials.token,
  			name: login_data.profile.name,
  			photo: `https://graph.facebook.com/${user_id}/picture?width=100`
  		}
    });

  }


  onLogin(login_data) {
  	this.setUser(login_data);
  	this.setFriends(login_data.credentials.token);
  }


  onLoginFound(data) {

    let token = data.credentials.token;

    fetch(`https://graph.facebook.com/me?access_token=${token}`)
  		.then((response) => response.json())
  		.then((responseJson) => {

  			let login_data = {
  				profile: {
  					id: responseJson.id,
  					name: responseJson.name
  				},
  				credentials: {
  					token: token
  				}
  			};
      	this.setUser(login_data);

      })
	    .catch((error) => {
	      console.log('something went wrong', error);
	    });

	    this.setFriends(token);

  }


  onLogout() {
    this.setState({
      is_loggedin: false,
      user: null,
      friends: null,
      is_subscribed_to: null
    });
  }


  setFriends(token) {
  	fetch(`https://graph.facebook.com/me/friends?access_token=${token}`)
		  .then((response) => response.json())
		  .then((responseJson) => {
  			this.setState({
  			  friends: responseJson.data
  			});
		  })
      .catch((error) => {
        console.log('something went wrong', error);
      });
  }


  componentWillMount() {
    this.pusher = new Pusher('YOUR PUSHER APP ID', {
      authEndpoint: 'YOUR AUTH SERVER ENDPOINT',
      cluster: 'ap1',
      encrypted: true,
      auth: {
        params: {
          app_key: 'YOUR UNIQUE KEY',
        }
      }
    });


    DeviceEventEmitter.addListener('unsubscribe', (e) => {
  		let friend_id = this.state.subscribed_to;
  		this.pusher.unsubscribe(`private-friend-${friend_id}`);
    });

  }


  toggleLocationSharing() {

  	let is_location_shared = !this.state.is_location_shared;

    this.setState({
		  is_location_shared: is_location_shared
  	});

    let user_id = this.state.user.id;

    if(!is_location_shared){
  		this.pusher.unsubscribe(`private-friend-${user_id}`);
      if(this.watchId){
        navigator.geolocation.clearWatch(this.watchId);
      }
  	}else{

      this.user_channel = this.pusher.subscribe(`private-friend-${user_id}`);
      this.user_channel.bind('client-friend-subscribed', (friend_data) => {

        let friends_count = this.state.subscribed_friends_count + 1;
        this.setState({
          subscribed_friends_count: friends_count
        });

        if(friends_count == 1){
          this.watchId = navigator.geolocation.watchPosition(
            (position) => {
              var region = regionFrom(
                position.coords.latitude,
                position.coords.longitude,
                position.coords.accuracy
              );
              this.user_channel.trigger('client-location-changed', region);
            }
          );
        }

      });

    }
  }


  onViewLocation(friend) {

    this.friend_channel = this.pusher.subscribe(`private-friend-${friend.id}`);
  	this.friend_channel.bind('pusher:subscription_succeeded', () => {
  		let username = this.state.user.name;
  		this.friend_channel.trigger('client-friend-subscribed', {
  			name: username
  		});
  	});

  	this.setState({
  		subscribed_to: friend.id
  	});

  	const { navigate } = this.props.navigation;

  	navigate('MapPage', {
  		name: friend.name,
  		friend_channel: this.friend_channel
  	});

  }


  render() {

    return (
    	<View style={styles.page_container}>
    		{
    			this.state.is_loggedin &&
            <View style={styles.container}>
			      	{
			      		this.state.user &&
                <View style={styles.profile_container}>
                  <Profile
                    profile_picture={this.state.user.photo}
                    profile_name={this.state.user.name}
                  />

                  <Text>Share Location</Text>
                	<Switch
                    value={this.state.is_location_shared}
                    onValueChange={this.toggleLocationSharing} />
                </View>
			      	}

			      	{
			      		this.state.friends &&
			      		<Friends
			      			friends={this.state.friends}
			      			onViewLocation={this.onViewLocation} />
			      	}
            </View>
    		}

  			<FBLogin
  				permissions={["email", "user_friends"]}
  				onLogin={this.onLogin}
  				onLoginFound={this.onLoginFound}
  				onLogout={this.onLogout}
  				style={styles.button}
  			/>
		  </View>
    );

  }

}

const styles = StyleSheet.create({
  page_container: {
  	...StyleSheet.absoluteFillObject,
  	justifyContent: 'flex-end'
  },
	container: {
    flex: 1,
    padding: 20
	},
	profile_container: {
		flex: 1,
		alignItems: 'center',
		marginBottom: 50
	},
	button: {
		paddingBottom: 30,
		marginBottom: 20,
		alignSelf: 'center'
	}
});

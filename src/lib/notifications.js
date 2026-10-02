import { PushNotifications } from '@capacitor/push-notifications'
import {
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from './firebase'

let latestFcmToken = null

export async function saveFcmTokenForUser(user) {
  if (!user) {
    console.log(
      'TajVid: Cannot save FCM token - no user'
    )
    return false
  }

  const token =
    latestFcmToken ||
    localStorage.getItem('tajvid_fcm_token')

  if (!token) {
    console.log(
      'TajVid: Cannot save FCM token - no token'
    )
    return false
  }

  try {
    await setDoc(
      doc(db, 'fcmTokens', user.uid),
      {
        uid: user.uid,
        token: token,
        updatedAt: serverTimestamp(),
      },
      {
        merge: true,
      }
    )

    console.log(
      'TajVid: FCM token saved successfully'
    )

    return true
  } catch (error) {
    console.error(
      'TajVid: Failed to save FCM token:',
      error
    )

    return false
  }
}

export async function initNotifications() {
  try {
    console.log(
      'TajVid: Initializing FCM...'
    )

    const permission =
      await PushNotifications.checkPermissions()

    let finalPermission = permission

    if (permission.receive === 'prompt') {
      finalPermission =
        await PushNotifications.requestPermissions()
    }

    if (finalPermission.receive !== 'granted') {
      console.log(
        'TajVid: Notification permission not granted'
      )
      return
    }

    await PushNotifications.addListener(
      'registration',
      async (token) => {
        latestFcmToken = token.value

        localStorage.setItem(
          'tajvid_fcm_token',
          token.value
        )

        console.log(
          'TajVid FCM TOKEN RECEIVED:',
          token.value
        )

        // If a user is already logged in,
        // save the token immediately.
        try {
          const savedUser =
            JSON.parse(
              localStorage.getItem(
                'tajvid_user'
              ) || 'null'
            )

          if (savedUser) {
            await saveFcmTokenForUser(
              savedUser
            )
          }
        } catch (error) {
          console.error(
            'TajVid: Token auto-save error:',
            error
          )
        }
      }
    )

    await PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error(
          'TajVid FCM registration error:',
          error
        )
      }
    )

    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log(
          'TajVid notification received:',
          notification
        )
      }
    )

    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log(
          'TajVid notification action:',
          action
        )
      }
    )

    await PushNotifications.register()

    console.log(
      'TajVid: FCM registration started'
    )
  } catch (error) {
    console.error(
      'TajVid FCM setup failed:',
      error
    )
  }
}

import webPush from "web-push"
const vapidKeys = webPush.generateVAPIDKeys()
console.log("Add these to your .env.local and Vercel environment variables:\n")
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`)

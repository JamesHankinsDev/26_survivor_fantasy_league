#!/bin/bash
# Script to add environment variables to Vercel

echo "Adding environment variables to Vercel..."

vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production <<< "AIzaSyA94ZOTnXOu-paGgKRyvgxbmSDmep2TQr4"
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production <<< "survivor-fantasy-league-fb65f.firebaseapp.com"
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production <<< "survivor-fantasy-league-fb65f"
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production <<< "survivor-fantasy-league-fb65f.firebasestorage.app"
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production <<< "766119518508"
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production <<< "1:766119518508:web:6ba2b73a68c74b52b28c89"
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production <<< "survivor-fantasy-league-418118"

echo "Done! Redeploy your project for changes to take effect: vercel --prod"

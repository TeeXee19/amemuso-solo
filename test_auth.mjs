import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kqiwchjeimqotaquncdh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaXdjaGplaW1xb3RhcXVuY2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjczNDUsImV4cCI6MjA4NzQ0MzM0NX0.xfMy-se8j9cz0OoUdytRthuilwNIpjgdmWN5f1HPYx0'
);

async function testAuth() {
  console.log("Attempting sign up...");
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@example.com',
    password: 'Password@123'
  });
  console.log("Sign Up Result:", data, error);

  if (error && error.message.includes("User already registered")) {
       console.log("Attempting sign in...");
       const res = await supabase.auth.signInWithPassword({
            email: 'admin@example.com',
            password: 'Password@123'
       });
       console.log("Sign In Result:", res.data, res.error);
  }
}

testAuth();

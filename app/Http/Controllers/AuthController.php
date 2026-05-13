<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // Check if someone is already logged in
    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    // Handle Sign Up
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password), // Securely encrypts the password!
        ]);

        // Log them in immediately after signing up
        Auth::login($user);

        return response()->json($user);
    }

    // Handle Log In
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // This checks the database to see if the email and encrypted password match
        if (Auth::attempt($credentials)) {
            $request->session()->regenerate(); // Security best practice
            return response()->json(Auth::user());
        }

        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    // Handle Log Out
    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['message' => 'Logged out']);
    }
}

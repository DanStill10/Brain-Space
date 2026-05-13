<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Idea;

class IdeaController extends Controller
{
    // Grab every idea in the local database
    public function index()
    {
        return response()->json(Idea::all());
    }

    // Save a new idea
    public function store(Request $request)
    {
        $request->validate([
            'text' => 'required|string',
            'color' => 'nullable|string',
            'priority' => 'integer'
        ]);

        $idea = Idea::create([
            'text' => $request->text,
            'color' => $request->color,
            'priority' => $request->priority ?? 0,
        ]);

        return response()->json($idea);
    }
}
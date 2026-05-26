<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Idea;
use Illuminate\Support\Carbon;

class IdeaController extends Controller
{
    public function index()
    {
        $ideas = Idea::whereNull('parent_id')->with('children')->get();
        return response()->json($ideas);
    }

    public function store(Request $request)
    {
        $request->validate([
            'text' => 'required|string',
            'color' => 'nullable|string',
            'priority' => 'integer',
            'parent_id' => 'nullable|exists:ideas,id' 
        ]);

        $idea = Idea::create([
            'text' => $request->text,
            'color' => $request->color,
            'priority' => $request->priority ?? 0,
            'parent_id' => $request->parent_id,
            'last_interacted_at' => now()
        ]);

        return response()->json($idea);
    }
    
    public function update(Request $request, Idea $idea)
    {
        $request->validate([
            'parent_id' => 'nullable|exists:ideas,id'
        ]);

        $idea->update([
            'parent_id' => $request->parent_id,
            'last_interacted_at' => now()
        ]);

        return response()->json($idea);
    }

    public function rescue(Idea $idea)
    {
        $idea->update([
            'last_interacted_at' => now()
        ]);

        return response()->json($idea);
    }
}
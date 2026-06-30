<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Idea;
use Illuminate\Support\Carbon;

class IdeaController extends Controller
{
    public function index()
    {
        $ideas = auth()->user()->ideas()->whereNull('parent_id')
                    ->where('is_completed', false)
                    ->with(['children' => function($query) {
                        $query->where('is_completed', false);
                    }])
                    ->get();

        $completed = auth()->user()->ideas()->where('is_completed', true)->get(['id', 'text', 'color', 'pattern', 'completed_at']);

        return response()->json([
            'active' => $ideas,
            'completed' => $completed
        ]);
    }

    public function complete(Idea $idea)
    {
        $idea->update([
            'is_completed' => true,
            'completed_at' => now()
        ]);

        return response()->json($idea);
    }

    public function store(Request $request)
    {
        $request->validate([
            'text' => 'required|string',
            'color' => 'nullable|string',
            'pattern' => 'nullable|string',
            'priority' => 'integer',
            'parent_id' => 'nullable|exists:ideas,id' 
        ]);

        $idea = auth()->user()->ideas()->create([
            'text' => $request->text,
            'color' => $request->color,
            'pattern' => $request->pattern,
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

    public function destroy(Idea $idea)
    {
        // Recursively delete children if needed, or just delete the idea.
        // For now, let's just delete the idea.
        $idea->delete();

        return response()->json(['success' => true]);
    }
}
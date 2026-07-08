<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Idea;
use App\Models\IdeaUpdate;
use Illuminate\Support\Facades\Storage;

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

    public function show(Idea $idea)
    {
        if ($idea->user_id !== auth()->id()) {
            abort(403);
        }

        $idea->load(['children' => function($query) {
            $query->where('is_completed', false);
        }, 'updates']);

        return response()->json($idea);
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

    public function storeUpdate(Request $request, Idea $idea)
    {
        if ($idea->user_id !== auth()->id()) {
            abort(403);
        }

        $request->validate([
            'content' => 'nullable|string|max:10000',
            'media' => 'nullable|file|image|max:10240',
        ]);

        if (!$request->filled('content') && !$request->hasFile('media')) {
            return response()->json(['message' => 'Provide text or an image.'], 422);
        }

        $updateData = ['idea_id' => $idea->id];

        if ($request->filled('content')) {
            $updateData['content'] = $request->content;
        }

        if ($request->hasFile('media')) {
            $path = $request->file('media')->store('idea-media', 'public');
            $updateData['media_url'] = Storage::disk('public')->url($path);
            $updateData['media_type'] = $request->file('media')->getMimeType();
        }

        $update = IdeaUpdate::create($updateData);

        $idea->update(['last_interacted_at' => now()]);

        return response()->json($update, 201);
    }

    public function destroyUpdate(Idea $idea, IdeaUpdate $update)
    {
        if ($idea->user_id !== auth()->id()) {
            abort(403);
        }

        if ($update->media_url && !str_starts_with($update->media_url, 'http')) {
            $relativePath = str_replace('/storage/', '', $update->media_url);
            Storage::disk('public')->delete($relativePath);
        }

        $update->delete();

        return response()->json(['success' => true]);
    }

    public function destroy(Idea $idea)
    {
        $idea->delete();

        return response()->json(['success' => true]);
    }
}
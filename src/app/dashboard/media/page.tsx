import connectToDatabase from "@/lib/mongoose";
import Post from "@/models/Post";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon, Heart, Clock } from "lucide-react";
import Story from "@/models/Story";
import Product from "@/models/Product";
import { CreatePostForm, CreateStoryForm } from "./content-forms";
import { RowActions } from "./row-actions";
import Image from "next/image";
import { requireOwnerTenant } from "@/lib/tenant";
import { OwnerPagination } from "@/components/ui/owner-pagination";
import { clampOwnerPage, getOwnerPagination, type OwnerListSearchParams } from "@/lib/owner-pagination";

export default async function SocialFeedDashboard({ searchParams }: { searchParams: OwnerListSearchParams }) {
  const { shopId, shop } = await requireOwnerTenant();
  await connectToDatabase();

  const { page: requestedPage, perPage } = await getOwnerPagination(searchParams);
  const loadPosts = (pageNumber: number) => Post.find({ shopId })
    .select("caption mediaUrls mediaType likesCount isPublished createdAt")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * perPage)
    .limit(perPage)
    .lean();
  const [products, stories] = await Promise.all([
    Product.find({ shopId }).sort({ createdAt: -1 }).limit(100).select("name").lean(),
    Story.find({ shopId, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).limit(30).select("mediaUrl mediaType expiresAt").lean(),
  ]);
  const videoEnabled = shop.videoUploadsEnabled === true;
  const maxVideoSeconds = Math.min(120, Math.max(5, Number(shop.maxVideoDurationSeconds ?? 30)));
  const [totalPosts, requestedPosts] = await Promise.all([
    Post.countDocuments({ shopId }),
    loadPosts(requestedPage),
  ]);
  const page = clampOwnerPage(requestedPage, totalPosts, perPage);
  const posts = page === requestedPage ? requestedPosts : await loadPosts(page);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Social Feed</h1>
          <p className="text-gray-500 mt-2">Manage your Instagram-style shop posts and updates.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Post Creation Prompt / Quick Stats */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Post</CardTitle>
            </CardHeader>
            <CardContent>
              <CreatePostForm products={products.map((p) => ({ id: p._id.toString(), name: p.name }))} videoEnabled={videoEnabled} maxVideoSeconds={maxVideoSeconds} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Story</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateStoryForm videoEnabled={videoEnabled} maxVideoSeconds={maxVideoSeconds} />
            </CardContent>
          </Card>
        </div>

        {/* Feed Preview */}
        <div className="md:col-span-2 space-y-6">
          {stories.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Live Stories ({stories.length})</CardTitle></CardHeader>
              <CardContent className="flex gap-3 overflow-x-auto">
                {stories.map((story) => (
                  <div key={story._id.toString()} className="w-28 shrink-0 space-y-1">
                    <div className="relative aspect-[9/16] overflow-hidden rounded-md bg-gray-100">
                      {story.mediaType === "VIDEO"
                        ? <video src={story.mediaUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                        : <Image src={story.mediaUrl} alt="Story" fill sizes="112px" className="object-cover" />}
                    </div>
                    <p className="flex items-center gap-1 text-[11px] text-gray-500"><Clock className="h-3 w-3" /> until {new Date(story.expiresAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                    <RowActions endpoint={`/api/stories/${story._id.toString()}`} noun="story" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {posts.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center bg-white">
              <ImageIcon className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No posts yet</h3>
              <p className="text-gray-500 mt-1">Use the form to share your first photo or video.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {posts.map((post) => (
                <Card key={post._id.toString()} className="overflow-hidden">
                  <div className="aspect-square bg-gray-100 relative">
                    {post.mediaUrls?.[0] ? (
                      <Image src={post.mediaUrls[0]} alt="Post" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No Media</div>
                    )}
                    {post.mediaType === 'CAROUSEL' && (
                      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                        1/{post.mediaUrls.length}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1 text-gray-600 text-sm">
                        <Heart className="w-4 h-4" /> {post.likesCount}
                      </div>
                    </div>
                    {post.caption && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {post.caption}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString()}{post.isPublished === false ? " · Hidden" : ""}
                      </p>
                      <RowActions
                        endpoint={`/api/posts/${post._id.toString()}`}
                        noun="post"
                        toggle={{ field: "isPublished", value: post.isPublished !== false, onLabel: "Show", offLabel: "Hide" }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <OwnerPagination basePath="/dashboard/media" page={page} perPage={perPage} totalItems={totalPosts} />
        </div>
      </div>
    </div>
  );
}

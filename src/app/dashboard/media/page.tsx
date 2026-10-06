import connectToDatabase from "@/lib/mongoose";
import Post from "@/models/Post";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComingSoonButton as Button } from "@/components/ui/coming-soon-button";
import { Plus, Image as ImageIcon, Video, Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import { getCurrentSession } from "@/lib/session";
import { OwnerPagination } from "@/components/ui/owner-pagination";
import { clampOwnerPage, getOwnerPagination, type OwnerListSearchParams } from "@/lib/owner-pagination";

export default async function SocialFeedDashboard({ searchParams }: { searchParams: OwnerListSearchParams }) {
  const session = await getCurrentSession();
  await connectToDatabase();

  const shopId = session?.user.shopId;
  const { page: requestedPage, perPage } = await getOwnerPagination(searchParams);
  const loadPosts = (pageNumber: number) => Post.find({ shopId })
    .select("caption mediaUrls mediaType likesCount createdAt")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * perPage)
    .limit(perPage)
    .lean();
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
        <Button className="gap-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 border-0">
          <Plus className="w-4 h-4" /> Create Post
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Post Creation Prompt / Quick Stats */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Create</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start gap-3 h-12">
                <ImageIcon className="w-5 h-5 text-blue-500" /> Photo Post
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-12">
                <Video className="w-5 h-5 text-red-500" /> Video Reel
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feed Preview */}
        <div className="md:col-span-2 space-y-6">
          {posts.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center bg-white">
              <ImageIcon className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No posts yet</h3>
              <p className="text-gray-500 mt-1 mb-4">Start building your audience by sharing your first photo or video.</p>
              <Button>Create your first post</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {posts.map((post) => (
                <Card key={post._id.toString()} className="overflow-hidden">
                  <div className="aspect-square bg-gray-100 relative">
                    {post.mediaUrls?.[0] ? (
                      <Image src={post.mediaUrls[0]} alt="Post" fill sizes="(min-width: 640px) 50vw, 100vw" unoptimized className="object-cover" />
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
                      <div className="flex items-center gap-1 text-gray-600 text-sm">
                        <MessageCircle className="w-4 h-4" /> 0
                      </div>
                    </div>
                    {post.caption && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {post.caption}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
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

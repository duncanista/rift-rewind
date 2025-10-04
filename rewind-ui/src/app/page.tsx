import Navbar from '@/components/Navbar';
import BlobBackground from '@/components/BlobBackground';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <BlobBackground 
        colors={['#8B5CF6', '#EC4899', '#1E40AF']}
        blobCount={3}
        minSizePercent={35}
        maxSizePercent={50}
        centerOffset={8}
      />
      <Navbar />
      <main className="flex-1">
        {/* Empty main content - ready for future additions */}
      </main>
      <Footer />
    </div>
  );
}

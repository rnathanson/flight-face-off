import { BrandHeader } from '@/components/BrandHeader';
import { BrandFooter } from '@/components/BrandFooter';
import { PartnershipInterestForm } from '@/components/PartnershipInterestForm';

export default function PartnershipInterest() {
  return (
    <div className="min-h-screen flex flex-col">
      <BrandHeader />
      
      <main className="flex-1 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <PartnershipInterestForm />
        </div>
      </main>
      
      <BrandFooter />
    </div>
  );
}

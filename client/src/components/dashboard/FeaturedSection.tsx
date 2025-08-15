import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function FeaturedSection() {
  const [_, setLocation] = useLocation();
  
  const viewEligibleProducts = () => {
    setLocation('/products');
  };
  
  const learnMore = () => {
    // You can implement more information about the offer here
    window.alert("Contact our sales team for more information about bulk discounts!");
  };
  
  return (
    <section className="mb-8">
      <div className="bg-slate-800 rounded-xl shadow-md overflow-hidden">
        <div className="md:flex">
          <div className="p-8 flex flex-col justify-center">
            <span className="inline-block bg-primary bg-opacity-20 text-primary px-3 py-1 rounded-full text-sm font-medium mb-3">
              Special Offer
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white font-heading mb-3">
              Bulk Order Discount
            </h2>
            <p className="text-slate-300 mb-6">
              Get up to 25% off on orders over $5,000. Limited time offer for qualified business customers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={viewEligibleProducts}>
                View Eligible Products
              </Button>
              <Button 
                variant="outline" 
                className="border-slate-600 hover:border-slate-400 text-white bg-transparent"
                onClick={learnMore}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Link, useLocation } from "react-router-dom";
import BrandLogo from "@/Components/BrandLogo";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const links = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/Services" },
    { name: "Faqs", path: "/Faqs" },
    { name: "EMI Calculator", path: "/Emi-Calculator" },
    { name: "Repay", path: "/Repayment" },
    { name: "Policies", path: "/Policies" },
    { name: "About", path: "/About" },
    { name: "Contact", path: "/Contact" },
  ];

  const renderLinks = (isMobile = false) =>
    links.map((link) => {
      const isActive = location.pathname === link.path;

      return (
        <Link
          key={link.name}
          to={link.path}
          onClick={() => setIsOpen(false)}
          className={`relative ${
            isMobile
              ? `block rounded-md px-2 py-2.5 text-base font-medium transition ${
                  isActive
                    ? "bg-purple-50 text-purple-600 font-semibold"
                    : "text-muted-foreground hover:bg-gray-100"
                }`
              : `text-sm font-medium transition ${
                  isActive
                    ? "text-purple-600"
                    : "text-black hover:text-purple-600"
                }`
          }`}
        >
          {link.name}

          {!isMobile && (
            <span
              className={`absolute left-0 -bottom-1 h-[2px] bg-purple-600 transition-all duration-300 ${
                isActive ? "w-full" : "w-0 group-hover:w-full"
              }`}
            />
          )}
        </Link>
      );
    });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">

        {/* Logo */}
        <Link to="/" className="flex h-14 w-[168px] shrink-0 items-center md:w-[190px]">
          <BrandLogo className="max-h-12 w-full object-contain object-left" priority />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-5 lg:gap-7">
          {renderLinks(false)}
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Log In
            </Button>
          </Link>
          <Button asChild className="bg-purple-600 text-white hover:bg-purple-700">
            <Link to="/user/apply">
              Apply Now
            </Link>
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-gray-100 transition"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Toggle mobile menu"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close mobile menu"
            className="fixed bottom-0 left-0 right-[min(18rem,85vw)] top-16 z-[60] bg-black/40 backdrop-blur-md md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Mobile Menu */}
          <div className="fixed right-0 top-16 z-[70] h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-72 max-w-[85vw] overflow-y-auto border-l border-border bg-white py-3 shadow-2xl md:hidden">
            <div className="px-4 space-y-1">
              {renderLinks(true)}

              {/* Buttons */}
              <div className="flex flex-col gap-3 pt-4">
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full h-11 text-base"
                  >
                    Log In
                  </Button>
                </Link>

                <Button
                  asChild
                  className="w-full h-11 text-base bg-purple-600 text-white hover:bg-purple-700"
                >
                  <Link to="/user/apply" onClick={() => setIsOpen(false)}>
                    Apply Now
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;

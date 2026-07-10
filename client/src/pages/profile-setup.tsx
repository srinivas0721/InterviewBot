import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { profileUpdateSchema, type ProfileUpdate } from "@/lib/types";
import { useLocation } from "wouter";
import { Sprout, TreePine, Mountain } from "lucide-react";

const companies = [
  "Google", "Microsoft", "Amazon", "Apple", "Meta", "Netflix", "Tesla", "Other"
];

const roles = [
  "Software Engineer", "Frontend Developer", "Backend Developer", 
  "Full Stack Developer", "Data Scientist", "Product Manager"
];

export default function ProfileSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user data to pre-populate the form
  const userData = queryClient.getQueryData(["/api/auth/user"]) as any;

  const form = useForm<ProfileUpdate>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      experienceLevel: userData?.experienceLevel || "mid-level",
      targetCompanies: userData?.targetCompanies || [],
      targetRoles: userData?.targetRoles || [],
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data.user);
      toast({
        title: "Profile updated!",
        description: userData?.experienceLevel 
          ? "Your preferences have been updated successfully." 
          : "Your profile has been set up successfully.",
      });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileUpdate) => {
    updateProfileMutation.mutate(data);
  };

  const handleCompanyChange = (company: string, checked: boolean) => {
    const currentCompanies = form.getValues("targetCompanies");
    if (checked) {
      // Prevent duplicates
      if (!currentCompanies.includes(company)) {
        form.setValue("targetCompanies", [...currentCompanies, company]);
      }
    } else {
      form.setValue("targetCompanies", currentCompanies.filter(c => c !== company));
    }
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    const currentRoles = form.getValues("targetRoles");
    if (checked) {
      // Prevent duplicates
      if (!currentRoles.includes(role)) {
        form.setValue("targetRoles", [...currentRoles, role]);
      }
    } else {
      form.setValue("targetRoles", currentRoles.filter(r => r !== role));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {userData?.experienceLevel ? "Profile Settings" : "Complete Your Profile"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {userData?.experienceLevel 
              ? "Update your preferences to customize your interview experience" 
              : "Help us personalize your interview experience"
            }
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {userData?.experienceLevel ? "Update Your Preferences" : "Profile Setup"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Experience Level */}
              <div>
                <Label className="text-lg font-semibold mb-4 block">Experience Level</Label>
                <RadioGroup
                  value={form.watch("experienceLevel")}
                  onValueChange={(value) => form.setValue("experienceLevel", value as "fresher" | "mid-level" | "senior")}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fresher" id="fresher" data-testid="radio-fresher" />
                    <Label htmlFor="fresher" className="cursor-pointer">
                      <Card className="p-4 hover:border-primary transition-colors">
                        <div className="text-center">
                          <Sprout className="h-8 w-8 text-primary mx-auto mb-2" />
                          <div className="font-semibold">Fresher</div>
                          <div className="text-sm text-muted-foreground">0-1 years</div>
                        </div>
                      </Card>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mid-level" id="mid-level" data-testid="radio-mid-level" />
                    <Label htmlFor="mid-level" className="cursor-pointer">
                      <Card className="p-4 hover:border-primary transition-colors">
                        <div className="text-center">
                          <TreePine className="h-8 w-8 text-primary mx-auto mb-2" />
                          <div className="font-semibold">Mid-Level</div>
                          <div className="text-sm text-muted-foreground">2-5 years</div>
                        </div>
                      </Card>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="senior" id="senior" data-testid="radio-senior" />
                    <Label htmlFor="senior" className="cursor-pointer">
                      <Card className="p-4 hover:border-primary transition-colors">
                        <div className="text-center">
                          <Mountain className="h-8 w-8 text-primary mx-auto mb-2" />
                          <div className="font-semibold">Senior</div>
                          <div className="text-sm text-muted-foreground">5+ years</div>
                        </div>
                      </Card>
                    </Label>
                  </div>
                </RadioGroup>
                {form.formState.errors.experienceLevel && (
                  <p className="text-sm text-destructive mt-2">
                    {form.formState.errors.experienceLevel.message}
                  </p>
                )}
              </div>

              {/* Target Companies */}
              <div>
                <Label className="text-lg font-semibold mb-4 block">Target Companies</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {(() => {
                    const currentCompanies = form.watch("targetCompanies") || [];
                    
                    // Create deduplicated list - predefined companies first, then custom ones
                    const customCompanies = currentCompanies.filter(company => !companies.includes(company));
                    const allCompanies = [...new Set([...companies, ...customCompanies])];
                    
                    return allCompanies.map((company) => (
                      <div key={company} className="flex items-center space-x-2">
                        <Checkbox
                          id={`company-${company}`}
                          checked={currentCompanies.includes(company)}
                          onCheckedChange={(checked) => handleCompanyChange(company, checked as boolean)}
                          data-testid={`checkbox-company-${company.toLowerCase()}`}
                        />
                        <Label htmlFor={`company-${company}`} className="cursor-pointer">
                          {company}
                        </Label>
                      </div>
                    ));
                  })()}
                </div>
                <Input
                  placeholder="Add custom company..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.currentTarget.value.trim()) {
                        const company = e.currentTarget.value.trim();
                        const currentCompanies = form.getValues("targetCompanies");
                        // Only add if not already present (case-insensitive check)
                        if (!currentCompanies.some(c => c.toLowerCase() === company.toLowerCase())) {
                          handleCompanyChange(company, true);
                        }
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                  data-testid="input-custom-company"
                />
                {form.formState.errors.targetCompanies && (
                  <p className="text-sm text-destructive mt-2">
                    {form.formState.errors.targetCompanies.message}
                  </p>
                )}
              </div>

              {/* Target Roles */}
              <div>
                <Label className="text-lg font-semibold mb-4 block">Target Roles</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {(() => {
                    const currentRoles = form.watch("targetRoles") || [];
                    
                    // Create deduplicated list - predefined roles first, then custom ones
                    const customRoles = currentRoles.filter(role => !roles.includes(role));
                    const allRoles = [...new Set([...roles, ...customRoles])];
                    
                    return allRoles.map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role}`}
                          checked={currentRoles.includes(role)}
                          onCheckedChange={(checked) => handleRoleChange(role, checked as boolean)}
                          data-testid={`checkbox-role-${role.toLowerCase().replace(/\s+/g, '-')}`}
                        />
                        <Label htmlFor={`role-${role}`} className="cursor-pointer">
                          {role}
                        </Label>
                      </div>
                    ));
                  })()}
                </div>
                <Input
                  placeholder="Add custom role..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.currentTarget.value.trim()) {
                        const role = e.currentTarget.value.trim();
                        const currentRoles = form.getValues("targetRoles");
                        // Only add if not already present (case-insensitive check)
                        if (!currentRoles.some(r => r.toLowerCase() === role.toLowerCase())) {
                          handleRoleChange(role, true);
                        }
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                  data-testid="input-custom-role"
                />
                {form.formState.errors.targetRoles && (
                  <p className="text-sm text-destructive mt-2">
                    {form.formState.errors.targetRoles.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="lg"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-complete-setup"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Complete Setup"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

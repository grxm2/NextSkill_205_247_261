using System.ComponentModel.DataAnnotations;

namespace NextSkill_205_247_261.Models;

public class LoginForm
{
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; set; } = "";
    [Required, StringLength(128), DataType(DataType.Password)]
    public string Password { get; set; } = "";
    public bool RememberMe { get; set; }
}

public class RegisterForm
{
    [Required, StringLength(100, MinimumLength = 2)]
    [RegularExpression(@".*\S.*", ErrorMessage = "Please enter your full name.")]
    [Display(Name = "Full name")]
    public string FullName { get; set; } = "";
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; set; } = "";
    [Required, StringLength(128, MinimumLength = 8), DataType(DataType.Password)]
    public string Password { get; set; } = "";
    [Required, Compare(nameof(Password), ErrorMessage = "Passwords do not match.")]
    [DataType(DataType.Password), Display(Name = "Confirm password")]
    public string ConfirmPassword { get; set; } = "";
    [Range(typeof(bool), "true", "true", ErrorMessage = "Please accept the Terms of Use and Privacy Policy.")]
    public bool AcceptTerms { get; set; }
    [StringLength(128)]
    public string? InvitationCode { get; set; }
}

public record DashboardModel(string FullName, string Email, string Role, int Users, int Admins);
